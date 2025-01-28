use std::fs::{self, File};
use std::io::{self, Write, Read};
use std::path::Path;
use std::env;
use toml;
use serde::{Deserialize, Serialize};
use dialoguer::{Input, Confirm};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Config {
    search: SearchConfig,
    scraper: ScraperConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SearchConfig {
    category: String,
    filters: FiltersConfig,
    locations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct FiltersConfig {
    min_price: f64,
    max_price: f64,
    min_rooms: u8,
    max_rooms: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ScraperConfig {
    interval: u64,
    max_retries: u8,
    retry_delay: u64,
    user_agent: String,
}

#[derive(Serialize, Deserialize)]
struct Secrets {
    telegram: TelegramConfig,
}

#[derive(Serialize, Deserialize)]
struct TelegramConfig {
    api_token: String,
    chat_id: String,
}

fn default_config() -> Config {
    Config {
        search: SearchConfig {
            category: "mietwohnungen".to_string(),
            filters: FiltersConfig {
                min_price: 500.0,
                max_price: 1200.0,
                min_rooms: 2,
                max_rooms: 5,
            },
            locations: vec![
                "Wien, 02. Bezirk, Leopoldstadt".to_string(),
                "Wien, 03. Bezirk, Landstraße".to_string(),
                "Wien, 04. Bezirk, Wieden".to_string(),
            ],
        },
        scraper: ScraperConfig {
            interval: 180_000,
            max_retries: 3,
            retry_delay: 30_000,
            user_agent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0".to_string(),
        },
    }
}

fn create_systemd_service() -> io::Result<()> {
    let service_content = r#"[Unit]
Description=Willhaben Property Scraper
After=network.target

[Service]
ExecStart=/usr/local/bin/willhaben-scraper
Restart=always
User=scraper

[Install]
WantedBy=multi-user.target
"#;

    fs::create_dir_all("/etc/systemd/system")?;
    fs::write("/etc/systemd/system/willhaben-scraper.service", service_content)?;
    Ok(())
}

fn main() -> io::Result<()> {
    let mut config = default_config();
    let mut secrets = Secrets {
        telegram_api_token: None,
        telegram_chat_id: None,
    };

    // Interactive config setup
    println!("🏠 Willhaben Property Scraper Installer");

    // Search Category
    config.search.category = Input::new()
        .with_prompt("Enter property category")
        .default(config.search.category)
        .interact_text()?;

    // Price Filters
    config.search.filters.min_price = Input::new()
        .with_prompt("Minimum price")
        .default(config.search.filters.min_price)
        .interact_text()?;

    config.search.filters.max_price = Input::new()
        .with_prompt("Maximum price")
        .default(config.search.filters.max_price)
        .interact_text()?;

    // Room Filters
    config.search.filters.min_rooms = Input::new()
        .with_prompt("Minimum rooms")
        .default(config.search.filters.min_rooms)
        .interact_text()?;

    config.search.filters.max_rooms = Input::new()
        .with_prompt("Maximum rooms")
        .default(config.search.filters.max_rooms)
        .interact_text()?;

    // Locations
    config.search.locations = Input::new()
        .with_prompt("Enter locations (comma-separated)")
        .default(config.search.locations.join(", "))
        .interact_text()?
        .split(',')
        .map(|s| s.trim().to_string())
        .collect();

    // Telegram notification setup
    if Confirm::new()
        .with_prompt("Do you want to set up Telegram notifications?")
        .interact()?
    {
        secrets.telegram_api_token = Some(Input::new()
            .with_prompt("Enter Telegram API Token")
            .interact_text()?);

        secrets.telegram_chat_id = Some(Input::new()
            .with_prompt("Enter Telegram Chat ID")
            .interact_text()?);
    } else {
        println!("⚠️ Warning: No Telegram notifications. Listings will be printed to console.");
    }
    
    // Create necessary directories
    fs::create_dir_all("./config")?;
    fs::create_dir_all("./secrets")?;

    // Write config
    let config_toml = toml::to_string(&config).expect("Failed to serialize config");
    fs::write("./config/config.toml", config_toml)?;

    // Write secrets
    let secrets_yaml = serde_yaml::to_string(&secrets).expect("Failed to serialize secrets");
    fs::write("./secrets/secrets.yaml", secrets_yaml)?;

    // Create systemd service
    create_systemd_service()?;

    println!("✅ Installation complete!");
    Ok(())
}