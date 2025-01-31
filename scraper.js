import WillhabenPropertySearch from './willhaben-property-search.js';
import Storage from './storage.js';
import TelegramNotifier from './telegram.js';
import { parse } from 'yaml';
import config from './toml-config-loader.js';
import logger from './logger.js';
import { sleep } from './utils.js';
import path from 'path';
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

export default class PropertyScraper {
  constructor() {
    // Initialize storage with proper path and create data directory
    this.storage = new Storage(path.join(process.cwd(), 'data', 'last_seen_listing.json'));
    
    this.notifier = new TelegramNotifier(
      this.apiToken = apiToken,
      this.chatId = chatId
    );
    
    // Pass the notifier instance when creating WillhabenPropertySearch
    this.search = new WillhabenPropertySearch(this.notifier, process.argv.includes('--debug'));
    
    // Track scraper statistics
    this.stats = {
      startTime: new Date(),
      iterationCount: 0,
      totalListingsFound: 0,
      lastSuccessfulRun: null
    };
  }

  async run() {
    logger.debug('Starting scraper...', {
      config: {
        interval: config.scraper.interval,
        maxRetries: config.scraper.maxRetries,
        locations: config.search.locations
      },
      stats: this.stats
    });
    
    while (true) {
      try {
        await this.runSingleIteration();
      } catch (err) {
        logger.error('Scraping iteration failed:', {
          error: err.message,
          stack: err.stack,
          stats: this.stats
        });
        
        await this.notifier.sendErrorNotification({
          message: `🚨 Critical Error: Scraper main loop failed\n\nError: ${err.message}\n\nStats:\nTotal Iterations: ${this.stats.iterationCount}\nTotal Listings Found: ${this.stats.totalListingsFound}\n\nThe scraper will attempt to continue running.`
        });
      }
      
      await sleep(config.scraper.interval);
    }
  }

  async runSingleIteration() {
    let retries = 0;
    this.stats.iterationCount++;
    
    while (retries < config.scraper.maxRetries) {
      try {
        logger.debug('=== Starting New Iteration ===', {
          iteration: this.stats.iterationCount,
          retry: retries + 1,
          stats: this.stats
        });

        // Check current storage state
        const lastSeenListing = await this.storage.getLastSeenListing();
        logger.debug('Current storage state:', {
          hasLastSeen: !!lastSeenListing,
          lastSeenId: lastSeenListing?.id,
          lastSeenTimestamp: lastSeenListing?._lastUpdated
        });

        logger.debug('Search configuration:', {
          category: config.search.category,
          filters: config.search.filters,
          locations: config.search.locations
        });
  
        const listings = await this.search
          .category(config.search.category)
          .state(WillhabenPropertySearch.states.vienna)
          .filter(config.search.filters)
          .search(this.storage);
  
        logger.debug('Total initial listings:', {
          count: listings.length,
          detail: listings.map(l => ({
            id: l.id,
            location: l.location, 
            price: l.price, 
            rooms: l.number_of_rooms
          }))
        });
  
        /*const filteredListings = listings.filter(listing => 
          config.search.locations.includes(listing.location)
        );*/

        const filteredListings = listings.filter(listing => 
          config.search.locations.some(location => 
            listing.location.toLowerCase().includes(location.toLowerCase())
          )
        );
  
        logger.debug('Filtered listings:', {
          count: filteredListings.length,
          detail: filteredListings.map(l => ({
            id: l.id,
            location: l.location, 
            price: l.price, 
            rooms: l.number_of_rooms
          }))
        });
  
        if (filteredListings.length > 0) {
          logger.debug('Sending notifications for new listings');
          await this.notifier.sendNotification(filteredListings);
          this.stats.totalListingsFound += filteredListings.length;
        } else {
          logger.debug('No new listings found or already processed');
        }
  
        this.stats.lastSuccessfulRun = new Date();
        break;
      } catch (err) {
        retries++;
        logger.error(`Attempt ${retries} failed:`, {
          error: err.message,
          stack: err.stack,
          retry: retries,
          maxRetries: config.scraper.maxRetries
        });
        
        if (retries >= config.scraper.maxRetries) {
          await this.notifier.sendErrorNotification({
            message: `⚠️ Scraping Failed\n\nError: ${err.message}\n\nStats:\nTotal Iterations: ${this.stats.iterationCount}\nTotal Listings Found: ${this.stats.totalListingsFound}\n\nFailed after ${retries} attempts.`
          });
          throw err;
        }
        
        await sleep(config.scraper.retryDelay);
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      uptime: (new Date() - this.stats.startTime) / 1000 / 60, // in minutes
      successRate: this.stats.lastSuccessfulRun ? 
        (this.stats.totalListingsFound / this.stats.iterationCount).toFixed(2) : 0
    };
  }
}