const logger = {
  info: (message, data) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },

  warn: (message, data) => {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },

  error: (message, error) => {
    console.error(`[ERROR] ${message}`, error ? JSON.stringify(error, null, 2) : '');
  },

  debug: (message, data) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  },
};

module.exports = logger;
