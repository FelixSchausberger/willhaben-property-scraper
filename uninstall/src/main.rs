use std::fs;
use std::process::Command;
use dialoguer::Confirm;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🏠 Willhaben Property Scraper Uninstaller");

    // Confirm uninstallation
    if !Confirm::new()
        .with_prompt("Are you sure you want to uninstall the Willhaben Property Scraper?")
        .interact()?
    {
        println!("Uninstallation cancelled.");
        return Ok(());
    }

    // Stop and disable SystemD service
    let stop_service = Command::new("systemctl")
        .args(&["stop", "willhaben-scraper.service"])
        .status();

    let disable_service = Command::new("systemctl")
        .args(&["disable", "willhaben-scraper.service"])
        .status();

    // Remove SystemD service file
    let remove_service_file = fs::remove_file("/etc/systemd/system/willhaben-scraper.service");

    // Remove config and secrets directories
    let remove_config = fs::remove_dir_all("./config");
    let remove_secrets = fs::remove_dir_all("./secrets");

    // Remove binary (adjust path as needed)
    let remove_binary = fs::remove_file("/usr/local/bin/willhaben-scraper");

    // Reload SystemD
    let reload_systemd = Command::new("systemctl")
        .arg("daemon-reload")
        .status();

    // Check results
    match (
        stop_service,
        disable_service,
        remove_service_file,
        remove_config,
        remove_secrets,
        remove_binary,
        reload_systemd,
    ) {
        (Ok(_), Ok(_), Ok(_), Ok(_), Ok(_), Ok(_), Ok(_)) => {
            println!("✅ Uninstallation complete!");
            Ok(())
        }
        _ => {
            println!("⚠️ Partial uninstallation. Some files may require manual removal.");
            Err("Uninstallation encountered issues".into())
        }
    }
}