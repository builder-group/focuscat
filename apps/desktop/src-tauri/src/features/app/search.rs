use super::matcher::fuzzy_match;
use super::types::{App, SearchableItem, Website};
use crate::common::url::{extract_domain, is_domain_like};
use mado::{get_app_icon, get_installed_apps, InstalledAppsConfig};
use std::collections::HashSet;

pub struct AppSearch {
    apps: Vec<SearchableItem>,
    websites: Vec<SearchableItem>,
    groups: Vec<SearchableItem>,
}

impl AppSearch {
    pub fn new() -> Self {
        let (apps, websites, groups) = Self::load_all();
        return Self {
            apps,
            websites,
            groups,
        };
    }

    /// Refresh the cache (reloads apps from system).
    pub fn refresh(&mut self) {
        let (apps, websites, groups) = Self::load_all();
        self.apps = apps;
        self.websites = websites;
        self.groups = groups;
    }

    /// Search apps and websites by query.
    pub fn search(
        &mut self,
        query: &str,
        include_apps: bool,
        include_websites: bool,
        include_icons: bool,
        limit: usize,
    ) -> Vec<(SearchableItem, u32)> {
        // Create custom domain if query looks like a domain
        let mut custom_domain: Option<SearchableItem> = if include_websites && is_domain_like(query)
        {
            extract_domain(query).map(|d| SearchableItem::custom_domain(&d))
        } else {
            None
        };

        // Build search iterator
        let apps = if include_apps {
            self.apps.iter_mut()
        } else {
            [].iter_mut()
        };
        let websites = if include_websites {
            self.websites.iter_mut()
        } else {
            [].iter_mut()
        };
        let groups = if include_websites {
            self.groups.iter_mut()
        } else {
            [].iter_mut()
        };
        let to_search = groups
            .chain(apps)
            .chain(websites)
            .chain(custom_domain.iter_mut());

        // Search, dedupe by id (highest score wins), populate icons, and take limit
        let matches = fuzzy_match(to_search, query);
        let mut seen: HashSet<String> = HashSet::new();
        return matches
            .into_iter()
            .filter(|(item, _)| seen.insert(item.id().to_string()))
            .take(limit)
            .map(|(item, score)| {
                if include_icons {
                    Self::populate_icon(item);
                }
                (item.clone(), score)
            })
            .collect();
    }

    fn populate_icon(item: &mut SearchableItem) {
        match item {
            SearchableItem::App { app, .. } => {
                Self::populate_app_icon(app);
            }
            SearchableItem::Website { website, .. } => {
                Self::populate_website_icon(website);
            }
            SearchableItem::Group { websites, apps, .. } => {
                for website in websites.iter_mut() {
                    Self::populate_website_icon(website);
                }
                for app in apps.iter_mut() {
                    Self::populate_app_icon(app);
                }
            }
        }
    }

    fn populate_app_icon(app: &mut App) {
        if app.icon.is_some() {
            return;
        }
        let data = get_app_icon(&app.bundle_id, 64, true);
        app.icon = data.data_url;
        app.color = data.color;
    }

    fn populate_website_icon(website: &mut Website) {
        if website.icon.is_some() {
            return;
        }
        website.icon = Some(format!(
            "https://www.google.com/s2/favicons?domain={}&sz=64",
            website.domain
        ));
    }

    /// Load all searchable items (apps from system, websites + groups from predefined services).
    fn load_all() -> (
        Vec<SearchableItem>,
        Vec<SearchableItem>,
        Vec<SearchableItem>,
    ) {
        let apps = Self::load_apps();
        let installed_ids: HashSet<String> = apps
            .iter()
            .filter_map(|item| match item {
                SearchableItem::App { app, .. } => Some(app.bundle_id.clone()),
                _ => None,
            })
            .collect();
        let (groups, websites) = Self::load_services(&installed_ids);
        return (apps, websites, groups);
    }

    fn load_apps() -> Vec<SearchableItem> {
        let config = InstalledAppsConfig {
            include_icon: false,
            include_app_color: false,
            icon_size: 0,
        };

        return get_installed_apps(config)
            .into_iter()
            .map(|app| SearchableItem::app(app.bundle_id, Some(app.name)))
            .collect();
    }

    /// Build groups and individual website items from predefined services.
    /// A group is created when a service has multiple domains or an installed app.
    fn load_services(
        installed_ids: &HashSet<String>,
    ) -> (Vec<SearchableItem>, Vec<SearchableItem>) {
        let mut groups: Vec<SearchableItem> = Vec::new();
        let mut websites: Vec<SearchableItem> = Vec::new();

        for service in PREDEFINED_SERVICES.iter() {
            // Keywords: all domains + service name (for searchability)
            let mut domain_keywords: Vec<String> =
                service.domains.iter().map(|d| d.to_string()).collect();
            domain_keywords.push(service.name.to_string());

            // Always create individual website items for each domain
            for domain in service.domains.iter() {
                websites.push(SearchableItem::website(
                    domain.to_string(),
                    None, // Note: Name is None so frontend shows the domain (clearer than repeating service name)
                    domain_keywords.clone(),
                ));
            }

            // Collect installed apps for this service
            let installed_apps: Vec<App> = service
                .bundle_ids
                .iter()
                .filter(|bid| installed_ids.contains(**bid))
                .map(|bid| App::new(bid.to_string(), Some(service.name.to_string())))
                .collect();

            // Build a group if total members > 1
            let total_members = service.domains.len() + installed_apps.len();
            if total_members > 1 {
                let mut keywords = domain_keywords;
                for app in &installed_apps {
                    keywords.push(app.bundle_id.clone());
                }

                // Group member websites
                let group_websites: Vec<Website> = service
                    .domains
                    .iter()
                    .map(|d| Website::new(d.to_string(), None))
                    .collect();

                groups.push(SearchableItem::Group {
                    name: service.name.to_string(),
                    keywords,
                    websites: group_websites,
                    apps: installed_apps,
                });
            }
        }

        return (groups, websites);
    }
}

// MARK: - Service Data

const PREDEFINED_SERVICES: &[PredefinedService] = &[
    // Social Media
    PredefinedService {
        name: "YouTube",
        domains: &["youtube.com", "youtu.be", "youtube-nocookie.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Facebook",
        domains: &["facebook.com", "fb.com", "messenger.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Instagram",
        domains: &["instagram.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Twitter / X",
        domains: &["twitter.com", "x.com", "t.co"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "TikTok",
        domains: &["tiktok.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Reddit",
        domains: &["reddit.com", "redd.it"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "LinkedIn",
        domains: &["linkedin.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Pinterest",
        domains: &["pinterest.com", "pin.it"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Snapchat",
        domains: &["snapchat.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Discord",
        domains: &["discord.com", "discord.gg"],
        bundle_ids: &["com.hnc.Discord"],
    },
    PredefinedService {
        name: "Twitch",
        domains: &["twitch.tv"],
        bundle_ids: &[],
    },
    // Productivity
    PredefinedService {
        name: "Google",
        domains: &["google.com", "google.co.uk", "google.de", "google.fr"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Gmail",
        domains: &["mail.google.com", "gmail.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Google Drive",
        domains: &["drive.google.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Google Docs",
        domains: &["docs.google.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Google Calendar",
        domains: &["calendar.google.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Notion",
        domains: &["notion.so", "notion.com"],
        bundle_ids: &["notion.id"],
    },
    PredefinedService {
        name: "Slack",
        domains: &["slack.com", "app.slack.com"],
        bundle_ids: &["com.tinyspeck.slackmacgap"],
    },
    PredefinedService {
        name: "Trello",
        domains: &["trello.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Asana",
        domains: &["asana.com", "app.asana.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Monday.com",
        domains: &["monday.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Airtable",
        domains: &["airtable.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Figma",
        domains: &["figma.com"],
        bundle_ids: &["com.figma.Desktop"],
    },
    PredefinedService {
        name: "Canva",
        domains: &["canva.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Miro",
        domains: &["miro.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Linear",
        domains: &["linear.app"],
        bundle_ids: &["com.linear"],
    },
    PredefinedService {
        name: "ClickUp",
        domains: &["clickup.com", "app.clickup.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Basecamp",
        domains: &["basecamp.com", "3.basecamp.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Jira",
        domains: &["atlassian.net", "jira.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Confluence",
        domains: &["atlassian.net/wiki"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Todoist",
        domains: &["todoist.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Evernote",
        domains: &["evernote.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Calendly",
        domains: &["calendly.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Loom",
        domains: &["loom.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Grammarly",
        domains: &["grammarly.com", "app.grammarly.com"],
        bundle_ids: &[],
    },
    // Development
    PredefinedService {
        name: "GitHub",
        domains: &["github.com", "gist.github.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "GitLab",
        domains: &["gitlab.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Stack Overflow",
        domains: &["stackoverflow.com", "stackexchange.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "ChatGPT",
        domains: &["chat.openai.com", "chatgpt.com", "openai.com"],
        bundle_ids: &["com.openai.chat"],
    },
    PredefinedService {
        name: "Claude",
        domains: &["claude.ai", "anthropic.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Vercel",
        domains: &["vercel.com", "vercel.app"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Netlify",
        domains: &["netlify.com", "netlify.app"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "AWS",
        domains: &["aws.amazon.com", "console.aws.amazon.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Bitbucket",
        domains: &["bitbucket.org"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Supabase",
        domains: &["supabase.com", "app.supabase.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Railway",
        domains: &["railway.app"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Render",
        domains: &["render.com", "dashboard.render.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "DigitalOcean",
        domains: &["digitalocean.com", "cloud.digitalocean.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Heroku",
        domains: &["heroku.com", "dashboard.heroku.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Replit",
        domains: &["replit.com", "repl.it"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "CodePen",
        domains: &["codepen.io"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "CodeSandbox",
        domains: &["codesandbox.io"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "npm",
        domains: &["npmjs.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "crates.io",
        domains: &["crates.io"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Docs.rs",
        domains: &["docs.rs"],
        bundle_ids: &[],
    },
    // Design
    PredefinedService {
        name: "Dribbble",
        domains: &["dribbble.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Behance",
        domains: &["behance.net"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Adobe Creative Cloud",
        domains: &["adobe.com", "creativecloud.adobe.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Webflow",
        domains: &["webflow.com", "webflow.io"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Framer",
        domains: &["framer.com", "framer.app"],
        bundle_ids: &[],
    },
    // Entertainment
    PredefinedService {
        name: "Netflix",
        domains: &["netflix.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Spotify",
        domains: &["spotify.com", "open.spotify.com"],
        bundle_ids: &["com.spotify.client"],
    },
    PredefinedService {
        name: "Amazon Prime Video",
        domains: &["primevideo.com", "amazon.com/primevideo"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Disney+",
        domains: &["disneyplus.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Hulu",
        domains: &["hulu.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "HBO Max",
        domains: &["max.com", "hbomax.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Apple TV+",
        domains: &["tv.apple.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Vimeo",
        domains: &["vimeo.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Crunchyroll",
        domains: &["crunchyroll.com"],
        bundle_ids: &[],
    },
    // Gaming
    PredefinedService {
        name: "Steam",
        domains: &[
            "store.steampowered.com",
            "steampowered.com",
            "steamcommunity.com",
        ],
        bundle_ids: &["com.valvesoftware.steam"],
    },
    PredefinedService {
        name: "Epic Games",
        domains: &["epicgames.com", "store.epicgames.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "GOG",
        domains: &["gog.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Xbox",
        domains: &["xbox.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "PlayStation",
        domains: &["playstation.com", "store.playstation.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Nintendo",
        domains: &["nintendo.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "IGN",
        domains: &["ign.com"],
        bundle_ids: &[],
    },
    // Shopping
    PredefinedService {
        name: "Amazon",
        domains: &["amazon.com", "amazon.co.uk", "amazon.de", "amzn.to"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "eBay",
        domains: &["ebay.com", "ebay.co.uk"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Etsy",
        domains: &["etsy.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Shopify",
        domains: &["shopify.com", "myshopify.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "AliExpress",
        domains: &["aliexpress.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Walmart",
        domains: &["walmart.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Target",
        domains: &["target.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Best Buy",
        domains: &["bestbuy.com"],
        bundle_ids: &[],
    },
    // News & Reading
    PredefinedService {
        name: "Medium",
        domains: &["medium.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Substack",
        domains: &["substack.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "New York Times",
        domains: &["nytimes.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "BBC",
        domains: &["bbc.com", "bbc.co.uk"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "CNN",
        domains: &["cnn.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "The Guardian",
        domains: &["theguardian.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Hacker News",
        domains: &["news.ycombinator.com"],
        bundle_ids: &[],
    },
    // Communication
    PredefinedService {
        name: "WhatsApp",
        domains: &["web.whatsapp.com", "whatsapp.com"],
        bundle_ids: &["net.whatsapp.WhatsApp"],
    },
    PredefinedService {
        name: "Telegram",
        domains: &["telegram.org", "web.telegram.org"],
        bundle_ids: &["ru.keepcoder.Telegram"],
    },
    PredefinedService {
        name: "Zoom",
        domains: &["zoom.us"],
        bundle_ids: &["us.zoom.xos"],
    },
    PredefinedService {
        name: "Microsoft Teams",
        domains: &["teams.microsoft.com"],
        bundle_ids: &["com.microsoft.teams2"],
    },
    PredefinedService {
        name: "Google Meet",
        domains: &["meet.google.com"],
        bundle_ids: &[],
    },
    // Finance
    PredefinedService {
        name: "PayPal",
        domains: &["paypal.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Stripe",
        domains: &["stripe.com", "dashboard.stripe.com"],
        bundle_ids: &[],
    },
    // Learning
    PredefinedService {
        name: "Coursera",
        domains: &["coursera.org"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Udemy",
        domains: &["udemy.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Khan Academy",
        domains: &["khanacademy.org"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Duolingo",
        domains: &["duolingo.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Skillshare",
        domains: &["skillshare.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Codecademy",
        domains: &["codecademy.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "edX",
        domains: &["edx.org"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "LinkedIn Learning",
        domains: &["linkedin.com/learning"],
        bundle_ids: &[],
    },
    // AI Tools
    PredefinedService {
        name: "Midjourney",
        domains: &["midjourney.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Perplexity",
        domains: &["perplexity.ai"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Gemini",
        domains: &["gemini.google.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Copilot",
        domains: &["copilot.microsoft.com", "github.com/features/copilot"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Hugging Face",
        domains: &["huggingface.co"],
        bundle_ids: &[],
    },
    // Other
    PredefinedService {
        name: "Wikipedia",
        domains: &["wikipedia.org", "en.wikipedia.org"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Dropbox",
        domains: &["dropbox.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "iCloud",
        domains: &["icloud.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "OneDrive",
        domains: &["onedrive.live.com"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Outlook",
        domains: &["outlook.com", "outlook.live.com"],
        bundle_ids: &[],
    },
];

struct PredefinedService {
    name: &'static str,
    domains: &'static [&'static str],
    bundle_ids: &'static [&'static str],
}
