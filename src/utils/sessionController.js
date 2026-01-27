const { log } = require('../utils/logger');

async function ensureLoggedIn(page) {
  if (page.url().includes('LoginUserProfilePage')) {
    log('🔐 Login required. Please login once (captcha included).');
    await page.pause(); // officer logs in manually
    log('✅ Login completed, session active.');
  } else {
    log('✅ Session already active, login skipped.');
  }
}

module.exports = { ensureLoggedIn };
