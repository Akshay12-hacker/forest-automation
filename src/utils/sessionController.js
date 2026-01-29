const { log } = require('../utils/logger');

async function ensureLoggedIn(page) {
  // If already logged in
  if (page.url().includes('DashBoardHome.aspx')) {
    log('✅ Already on dashboard, login skipped');
    return;
  }

  // If on login page → manual login required
  if (page.url().includes('LoginUserProfilePage.aspx')) {
    log('🔐 Login required. Please login (email + password + captcha)');
     // officer logs in manually

    // 🔥 WAIT FOR DASHBOARD AFTER LOGIN
    await page.waitForURL(/DashBoardHome\.aspx/, {
      timeout: 120000 // captcha + human time
    });

    log('✅ Login completed, dashboard reached');
    return;
  }

  throw new Error(`Unexpected URL during login: ${page.url()}`);
}

module.exports = { ensureLoggedIn };
