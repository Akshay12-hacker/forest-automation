const { chromium } = require('playwright');
const path = require('path');
const { log } = require('../utils/logger');

const PROFILE_DIR = path.resolve(__dirname, '../../forest-browser-profile');

async function launchBrowser() {
  log(`Using browser profile at: ${PROFILE_DIR}`);

  const context = await chromium.launchPersistentContext(
    PROFILE_DIR,
    {
      headless: false,
      slowMo: 40,
      viewport: null,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ]
    }
  );

  const page = context.pages().length
    ? context.pages()[0]
    : await context.newPage();

  log('Persistent browser launched');

  return { context, page };
}

module.exports = { launchBrowser };
