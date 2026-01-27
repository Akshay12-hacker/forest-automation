const { log } = require('../utils/logger');
const { waitForHuman } = require('../utils/waitForHuman');

async function loginFlow(page) {
  log('Phase 3: User login flow started');

  // Ensure correct page
  await page.waitForURL(/LoginUserProfilePage\.aspx/, {
    timeout: 30000
  });

  log('Login page detected');

  // 🔹 Email & Password inputs (ASP.NET dynamic IDs)
  const textInputs = page.locator('input[type="text"]');
  const passwordInput = page.locator('input[type="password"]');

  // ⚠️ First run only (recommended)
  // await page.pause();

  await textInputs.first().fill('YOUR_EMAIL_ID');
  await passwordInput.first().fill('YOUR_PASSWORD');

  log('Email and password filled');

  // 🔹 Click Login
  await page.locator('input[type="submit"]').filter({
    hasText: /login/i
  }).click();

  log('Login button clicked');

  // 🔹 Wait for traveller page (URL or unique element)
  await page.waitForLoadState('domcontentloaded');

  log('Login successful, moving to traveller flow');
}

module.exports = { loginFlow };
