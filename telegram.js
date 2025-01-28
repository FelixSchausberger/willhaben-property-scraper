import axios from 'axios';
import logger from './logger.js';
import { parse } from 'yaml';
import { decryptSops } from "sops-age";

async function loadSecrets(filePath, secretKey) {
  try {
    // Decrypt the SOPS-encrypted file
    const decryptedFile = await decryptSops({
      path: filePath,
      secretKey: secretKey,
    });

    // Parse the decrypted YAML content
    return parse(JSON.stringify(decryptedFile, null, 2));
  } catch (error) {
    console.error("Failed to decrypt secrets:", error.message);
    process.exit(1);
  }
}

// Load and decrypt the secrets
const secretKey = process.env.SOPS_AGE_KEY; // Store this securely!
const secrets = await loadSecrets("./secrets/secrets.yaml", secretKey);

// Extract the Telegram credentials
const apiToken = secrets.telegram.apiToken;
const chatId = secrets.telegram.chatId;

class TelegramNotifier {
  constructor() {
    this.apiToken = apiToken;
    this.chatId = chatId;
    this.sentListings = new Set();
    setInterval(() => this.clearCache(), 24 * 60 * 60 * 1000);
  }

  clearCache() {
    this.sentListings.clear();
  }

  // Generate a unique key for a listing based on its properties
  getListingKey(listing) {
    return `${listing.location}-${listing.estate_size}-${listing.price}-${listing.number_of_rooms}`;
  }

  async sendErrorNotification(error) {
    if (!this.apiToken || !this.chatId) {
      logger.error('Cannot send error notification: Missing API token or chat ID');
      return;
    }

    const errorMessage = `⚠️ *Property Search Bot Error*\n\n${error.message}`;

    try {
      await axios.post(
        `https://api.telegram.org/bot${this.apiToken}/sendMessage`,
        {
          chat_id: this.chatId,
          text: errorMessage,
          parse_mode: 'Markdown',
        },
        { timeout: 10000 }
      );
    } catch (err) {
      logger.error('Failed to send error notification:', err.message);
    }
  }

  async sendNotification(listings) {
    // Filter out duplicate listings
    const newListings = listings.filter(listing => {
      const key = this.getListingKey(listing);
      if (this.sentListings.has(key)) {
        return false;
      }
      this.sentListings.add(key);
      return true;
    });

    // If no new listings after deduplication, return early
    if (newListings.length === 0) {
      logger.debug('No new unique listings to send');
      return;
    }

    const message = this.formatMessage(newListings);

    if (message.length > 4000) {
      logger.warn('Message truncated due to exceeding 4096 characters');
    }

    if (!this.apiToken || !this.chatId) {
      throw new Error('Missing API token or chat ID');
    }

    try {
      const botResponse = await axios.get(
        `https://api.telegram.org/bot${this.apiToken}/getMe`,
        { timeout: 5000 }
      );

      if (!botResponse.data.ok) {
        throw new Error('Invalid bot token');
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${this.apiToken}/sendMessage`,
        {
          chat_id: this.chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        },
        { timeout: 10000 }
      );

      if (!response.data.ok) {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

      return response.data;
    } catch (err) {
      if (err.response) {
        logger.error('Telegram API Error:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers,
        });
      } else if (err.request) {
        logger.error('No response received:', err.message);
      } else {
        logger.error('Error:', err.message);
      }
      throw err;
    }
  }

  formatMessage(listings) {
    if (!Array.isArray(listings) || listings.length === 0) {
      throw new Error('Invalid or empty listings array');
    }

    const formattedListings = listings.map((listing) => {
      const price = typeof listing.price === 'number' ? listing.price.toLocaleString() : listing.price;
      
      if (!listing.url) {
        throw new Error('Missing url for listing. The URL must include the complete path with property description.');
      }

      return `📍 ${listing.location || 'Location N/A'} - €${price}\n` +
        `🏠 ${listing.estate_size || 'N/A'}m² - ${listing.number_of_rooms || 'N/A'} rooms\n` +
        `🔗 [View Listing](${listing.url})`;
    });

    let message = `New listings found:\n\n${formattedListings.join('\n\n')}`;

    if (message.length > 4000) {
      message = message.substring(0, 4000) + '\n... (truncated)';
    }

    return message;
  }
}

export default TelegramNotifier;