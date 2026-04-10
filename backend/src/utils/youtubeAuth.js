const fs = require('fs');
const os = require('os');
const path = require('path');
const logger = require('./logger');

let cachedCookiesPath = null;

function getYtDlpAuthOptions() {
  const envCookiesFile = (process.env.YTDLP_COOKIES_FILE || '').trim();
  if (envCookiesFile) {
    return { cookies: envCookiesFile };
  }

  const envCookiesB64 = (process.env.YTDLP_COOKIES_B64 || '').trim();
  if (!envCookiesB64) {
    return {};
  }

  if (cachedCookiesPath && fs.existsSync(cachedCookiesPath)) {
    return { cookies: cachedCookiesPath };
  }

  try {
    const decoded = Buffer.from(envCookiesB64, 'base64').toString('utf8');

    // Basic format check for Netscape cookie file exported for yt-dlp.
    if (!decoded.includes('Netscape HTTP Cookie File')) {
      logger.warn('YTDLP_COOKIES_B64 does not look like a valid Netscape cookie file');
      return {};
    }

    const tempPath = path.join(os.tmpdir(), 'studiox_ytdlp_cookies.txt');
    fs.writeFileSync(tempPath, decoded, { encoding: 'utf8', mode: 0o600 });
    cachedCookiesPath = tempPath;

    return { cookies: tempPath };
  } catch (error) {
    logger.warn('Failed to parse YTDLP_COOKIES_B64', { error: error.message });
    return {};
  }
}

module.exports = {
  getYtDlpAuthOptions,
};
