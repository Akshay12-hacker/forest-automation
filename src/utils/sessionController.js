const { log } = require('./logger');
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

async function ensureLoggedIn(page) {
  if (!page) {
    throw new Error('ensureLoggedIn called without page');
  }

  const loginButton = page.locator('a.myButton:has-text("WANT TO LOGIN?")');

  // ✅ Already logged in
  if (await loginButton.count() === 0) {
    log('✅ User already logged in');
    return true;
  }

  log('🔐 User not logged in, login required');

  await loginButton.click();
  await page.locator('span.redButton:has-text("User Login")').click();

  await page.waitForURL(/LoginUserProfilePage\.aspx/, { timeout: 60000 });
  log('🧑‍💻 Login page opened — waiting for manual login...');

  const start = Date.now();
  while (true) {
    try {
      const stillExists = await page.locator('a.myButton').count();

      if (stillExists === 0) {
        break;
      }

      await page.waitForTimeout(1000); // check every 1 sec
    } catch (e) {
      log("⚠ Error checking login state: " + e.message);
    }

    if (Date.now() - start > LOGIN_TIMEOUT_MS) {
      throw new Error('Login timeout exceeded while waiting for manual login');
    }
  }

  log('✅ Login completed, session active');
  return true;
}

module.exports = { ensureLoggedIn };