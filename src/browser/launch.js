const { chromium, firefox } = require('playwright');
const config = require('../config/app.config');
const { log } = require('../utils/logger');

async function launchBrowser() {
    log('Launching browser...');

    const browser = await chromium.launch({
        headless: config.headless,
        args: config.browserArgs,
    });

    const context = await browser.newContext({
        viewport: null,
    });

    const page = await context.newPage();

    log('Browser launched successfully.');
    return { browser, context, page };
}

module.exports = { launchBrowser };