import fs from 'fs';
import toml from 'toml';

function loadConfig(configPath = './config/config.toml') {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = toml.parse(configContent);
    
    return {
      search: {
        category: config.search?.category || 'mietwohnungen',
        states: config.search?.states || ['vienna'],
        filters: {
          minPrice: config.search?.filters?.min_price || 500,
          maxPrice: config.search?.filters?.max_price || 1200,
          minRooms: config.search?.filters?.min_rooms || 2,
          maxRooms: config.search?.filters?.max_rooms || 5
        },
        locations: config.search?.locations || config.search?.filters?.locations || []
      },
      scraper: {
        interval: config.scraper?.interval || 180000,
        maxRetries: config.scraper?.max_retries || 3,
        retryDelay: config.scraper?.retry_delay || 30000,
        userAgent: config.scraper?.user_agent || 'Default User Agent'
      }
    };
  } catch (error) {
    console.error('Error loading configuration:', error);
    // Fallback configuration remains the same
    return {
      search: {
        category: 'mietwohnungen',
        states: ['vienna'],
        filters: {
          minPrice: 500,
          maxPrice: 1200,
          minRooms: 2,
          maxRooms: 5
        },
        locations: []
      },
      scraper: {
        interval: 180000,
        maxRetries: 3,
        retryDelay: 30000,
        userAgent: 'Default User Agent'
      }
    };
  }
}

export default loadConfig();