const { log } = require('./logger');

async function ensureLoggedIn(page) {
  const loginButton = page.locator('a.myButton:has-text("WANT TO LOGIN?")');

  // 🔍 HARD CHECK — if login button exists, user is NOT logged in
  if (await loginButton.count() === 0) {
    log('✅ User already logged in');
    return true;
  }

  // ❌ NOT LOGGED IN → MUST LOGIN
  log('🔐 User not logged in, login required');

  // Open login UI
  await loginButton.click();
  await page.locator('span.redButton:has-text("User Login")').click();

  // Wait for login page
  await page.waitForURL(/LoginUserProfilePage\.aspx/, { timeout: 90000 });
  log('🧑‍💻 Login page opened — please login manually (captcha)');



  // 🔒 REAL CONFIRMATION — login button disappears
  await page.waitForFunction(() => {
    return !document.querySelector('a.myButton');
  }, { timeout: 120000 });

  log('✅ Login completed, session active');
  return true;
}

module.exports = { ensureLoggedIn };
