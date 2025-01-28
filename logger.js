class Logger {
  constructor(isDebug = false) {
    this.isDebug = isDebug;
  }

  getTimestamp() {
    return new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  }

  log(message, ...args) {
    console.log(`[${this.getTimestamp()}] ${message}`, ...args);
  }

  debug(message, ...args) {
    if (this.isDebug) {
      this.log(`DEBUG: ${message}`, ...args);
    }
  }

  error(message, ...args) {
    console.error(`[${this.getTimestamp()}] ERROR: ${message}`, ...args);
  }
}

// Create a singleton instance
const logger = new Logger(process.argv.includes('--debug'));

export default logger;