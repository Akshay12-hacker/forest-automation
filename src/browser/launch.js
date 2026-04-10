const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { log } = require('../utils/logger');

const PROFILE_DIR = path.resolve(__dirname, '../../forest-browser-profile');

async function launchBrowser() {
  const launchOptions = {
    headless: false,
    slowMo: 40,
    viewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  };

  log(`Using browser profile at: ${PROFILE_DIR}`);

  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, launchOptions);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    const lockError =
      message.includes('Target page, context or browser has been closed') ||
      message.includes('user data directory is already in use');

    if (!lockError) {
      throw err;
    }

    const fallbackProfileDir = path.resolve(
      __dirname,
      `../../forest-browser-profile-runtime-${Date.now()}`
    );
    fs.mkdirSync(fallbackProfileDir, { recursive: true });

    log('⚠ Main browser profile appears locked, using temporary profile');
    log(`Using temporary browser profile at: ${fallbackProfileDir}`);
    context = await chromium.launchPersistentContext(fallbackProfileDir, launchOptions);
  }

  const page = context.pages().length
    ? context.pages()[0]
    : await context.newPage();

  log('Persistent browser launched');

  return { context, page };
}

module.exports = { launchBrowser };
