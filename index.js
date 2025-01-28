import logger from './logger.js';
import PropertyScraper from './scraper.js';

const scraper = new PropertyScraper();

scraper.run().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
