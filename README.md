# Willhaben Property Scraper

A Node.js scraper that monitors Willhaben.at for new property listings and sends notifications via Telegram when new listings are found that match your criteria.

## Features

- Monitors Willhaben's property listings in real-time
- Filters properties by price, rooms, and location
- Sends notifications via Telegram when new listings are found
- Configurable search parameters and notification settings
- Built-in rate limiting and retry logic to handle connection issues

## Installation

### Prerequisites

- Nix with flakes enabled
- Rust toolchain

### Install

1. Clone the repository:
```bash
git clone https://github.com/yourusername/willhaben-property-scraper.git
cd willhaben-property-scraper
```

2. Run interactive installation:
```bash
nix run .#install
```

The installation script will:

- Configure search parameters
- Set up optional Telegram notifications
- Create SystemD service
- Handle initial setup

### Uninstall
1. Run interactive uninstallation:
```bash
nix run .#uninstall
```

### Manual Setup
If you prefer manual configuration:

1. Edit `config/config.js`
2. Configure `secrets/secrets.yaml` (used for Telegram credentials, have a look at [Telegram Bot Setup](#telegram-bot-setup))
3. Run with `nix run .#default`

## Configuration

The scraper is configured through `config.js`. Here's how to set it up:

### Search Configuration

```javascript
search: {
  // Property category - available options:
  // - mietwohnungen (apartment rent)
  // - eigentumswohnung (apartment buy)
  // - haus-mieten (house rent)
  // - haus-kaufen (house buy)
  category: 'mietwohnungen',
  
  // Price and room filters
  filters: {
    minPrice: 500,    // Minimum price in EUR
    maxPrice: 1200,   // Maximum price in EUR
    minRooms: 2,      // Minimum number of rooms
    maxRooms: 5       // Maximum number of rooms
  },
  
  // Array of locations to search in
  // Format: "City, District Number. District Name"
  locations: [
    'Wien, 02. Bezirk, Leopoldstadt',
    'Wien, 03. Bezirk, Landstraße',
    'Wien, 04. Bezirk, Wieden',
    // ... add more locations as needed
  ],
}
```

### Telegram Bot Setup

To receive notifications, you'll need to set up a Telegram bot:

1. Create a new bot:
   - Open Telegram and search for "@BotFather"
   - Send `/newbot` command
   - Follow the instructions to create your bot
   - BotFather will give you a token - this is your `apiToken`

2. Get your chat ID:
   - Search for your newly created bot
   - Start a chat with it by clicking Start
   - Send any message to the bot
   - Visit: `https://api.telegram.org/bot<YourBOTToken>/getUpdates`
   - Look for the "chat" object and copy the "id" value - this is your `chatId`

3. Install (git-crypt)[https://github.com/AGWA/git-crypt]
4. Initialize the repo with `git-crypt init`
5. Add the `apiToken` and `chatId` values to `./secrets/secrets.yaml`:

```javascript
telegram: {
  apiToken: 'your_bot_token_here',
  chatId: 'your_chat_id_here'
}
```

6. Since the only user of this repository with access to decrypt secrets will be you, it’s more convenient to export a symmetric secret key and base64 encode it so that you can throw it in 1Password or something similar.

```shell
git-crypt export-key ./secret-key
cat ./secret-key | base64 > ./secret-key-base64
cat ./secret-key-base64
```

### Scraper Configuration

```javascript
scraper: {
  // How often to check for new listings (in milliseconds)
  interval: 300000,  // 5 minutes
  
  // User agent string for the requests
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
}
```

## Usage

Start the scraper:

```bash
node index.js
```

The scraper will:
1. Check Willhaben for new listings matching your criteria
2. Store found listings to avoid duplicate notifications
3. Send you a Telegram message when new matching listings are found
4. Repeat the process based on the configured interval

## Error Handling

The scraper includes built-in retry logic for common issues:
- Connection resets
- Rate limiting
- Temporary network issues

If persistent errors occur, check:
- Your internet connection
- Willhaben's website status
- Your configuration settings
- The scraper's logs for specific error messages (run with `node index.js --debug`)

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Disclaimer

This tool is for educational purposes only. Make sure to check Willhaben's terms of service and adjust your scraping frequency accordingly to avoid overwhelming their servers.
