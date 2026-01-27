module.exports = {
    browser: {
        headless: false,
        slowMo: 100,
        args: [
            '--start-maximized',
            '--disable-blink-features=AutomationControlled',
        ],
    },

    utils:{
        base: 'https://forest.mponline.gov.in/'
    },

    timeouts: {
        pageLoad: 30000,
    }
};