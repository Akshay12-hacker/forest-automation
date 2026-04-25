const { log } = require('./logger');
const { solveArithmeticCaptcha } = require('./captchaSolver');
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

  // Auto solve captcha while waiting
  try {
      const captchaInput = page.locator('#txtCaptchatext');
      if (await captchaInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          const answer = await solveArithmeticCaptcha(page, '#imgCaptcha');
          await captchaInput.fill(answer);
          log('✅ Login Captcha filled successfully');
      }
  } catch (error) {
      log('⚠️ Could not automatically solve login captcha: ' + error.message);
  }

  const start = Date.now();
  while (true) {
    try {
      const stillExists = await page.locator('a.myButton').count();

      if (stillExists === 0) {
        break;
      }
      
      // If login fails due to Captcha, automatically retry
      const errText = await page.locator('#dvErr, .error, #lblMsg').innerText().catch(() => '');
      if (errText.toLowerCase().includes('captcha')) {
          const captchaInput = page.locator('#txtCaptchatext');
          const currentVal = await captchaInput.inputValue().catch(() => '');
          if (!currentVal) { // Only refill if it's empty to avoid infinite loop of refilling
              log('⚠️ Login Captcha was incorrect! Retrying...');
              const answer = await solveArithmeticCaptcha(page, '#imgCaptcha').catch(() => null);
              if (answer) {
                  await captchaInput.fill(answer);
                  log('✅ Login Captcha refilled successfully');
              }
          }
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