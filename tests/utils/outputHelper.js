const path = require('path');
const fs = require('fs');
const axios = require('axios');

const OUTPUTS_ROOT = path.join(__dirname, '..', 'outputs');

function ensureOutputsDir(serviceName) {
  const dir = serviceName ? path.join(OUTPUTS_ROOT, serviceName) : OUTPUTS_ROOT;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Save test output file organized by service name
 * @param {string} serviceName - e.g. 'silence-remover', 'noise-reduction', 'video-to-gif'
 * @param {string} filename - e.g. 'silence_removed.mp3', 'enhanced_video.mp4'
 * @param {Buffer|string|object} contentOrUrl - Buffer, URL string to fetch, or JSON object
 * @param {string} baseUrl - Base API URL for relative paths
 */
async function saveServiceOutput(serviceName, filename, contentOrUrl, baseUrl = '') {
  try {
    const serviceDir = ensureOutputsDir(serviceName);
    const destinationPath = path.join(serviceDir, filename);

    if (Buffer.isBuffer(contentOrUrl) || contentOrUrl instanceof Uint8Array) {
      fs.writeFileSync(destinationPath, contentOrUrl);
      console.log(`      💾 Saved output to: tests/outputs/${serviceName}/${filename}`);
      return destinationPath;
    }

    if (typeof contentOrUrl === 'string') {
      if (contentOrUrl.startsWith('http://') || contentOrUrl.startsWith('https://') || contentOrUrl.startsWith('/')) {
        const fullUrl = contentOrUrl.startsWith('http')
          ? contentOrUrl
          : `${baseUrl.replace(/\/+$/, '')}/${contentOrUrl.replace(/^\/+/, '')}`;

        const response = await axios.get(fullUrl, { responseType: 'arraybuffer', timeout: 600000 });
        fs.writeFileSync(destinationPath, response.data);
        console.log(`      💾 Downloaded & saved to: tests/outputs/${serviceName}/${filename}`);
        return destinationPath;
      }

      // Plain text / SRT content
      fs.writeFileSync(destinationPath, contentOrUrl, 'utf-8');
      console.log(`      💾 Saved output to: tests/outputs/${serviceName}/${filename}`);
      return destinationPath;
    }

    if (typeof contentOrUrl === 'object') {
      fs.writeFileSync(destinationPath, JSON.stringify(contentOrUrl, null, 2), 'utf-8');
      console.log(`      💾 Saved JSON output to: tests/outputs/${serviceName}/${filename}`);
      return destinationPath;
    }
  } catch (err) {
    console.warn(`      ⚠️ Could not save output for ${serviceName}/${filename}: ${err.message}`);
  }
}

module.exports = {
  saveServiceOutput,
  ensureOutputsDir,
  OUTPUTS_ROOT,
};
