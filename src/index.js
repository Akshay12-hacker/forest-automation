const { launchBrowser } = require('./browser/launch');
const { log } = require('./utils/logger');
(async () => {
    log('Application started');
    try {
        const {browser, page} = await launchBrowser();
        log('System initialized');

        await page.goto('https://example.com', { waitUntil: 'load' });

        // Your application logic here

        setTimeout(async () => {
            await browser.close();
            log('Browser closed');
            process.exit(0);
        }, 5000); // Close the browser after 5 seconds for demonstration
    } catch (error) {
        log(`Error: ${error.message}`);
        process.exit(1);
    }
})();