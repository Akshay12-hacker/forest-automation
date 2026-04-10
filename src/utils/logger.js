const fs = require('fs');
const path = require('path');
const projectRoot = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(__dirname, '../..');

const logFile = path.join(projectRoot, 'logs', 'app.log');
const logDir = path.dirname(logFile);

function log(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logFile, entry);
  } catch (err) {
    console.error(`[${timestamp}] ⚠ Failed to write log file: ${err.message}`);
  }

  console.log(entry.trim());
}

module.exports = { log };