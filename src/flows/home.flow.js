const { log } = require('../utils/logger');

async function homeFlow(page) {
  log('Home flow started');

  await page.goto('https://forest.mponline.gov.in/', {
    waitUntil: 'domcontentloaded',
    timeout: 0,
  });

  log('Homepage DOM loaded');

  const loginButton = page.locator('a.myButton:has-text("WANT TO LOGIN?")');

  // 🔍 ONLY CHECK: does login button exist?
  if (await loginButton.count() > 0) {
    log('🔐 Login button present on homepage');
    return { needsLogin: true };
  }

  log('ℹ️ Login button not present on homepage');
  return { needsLogin: false };
}

module.exports = { homeFlow };
