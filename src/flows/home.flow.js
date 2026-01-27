const { log } = require('../utils/logger');

async function homeFlow(page) {
  log('Opening forest homepage');

  await page.goto('https://forest.mponline.gov.in/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  log('Homepage DOM loaded');

  // Wait for "Want to Login?"
  const wantLogin = page.locator('text=/want to login/i');
  await wantLogin.waitFor({ timeout: 60000 });

  log('"Want to Login?" detected');

  await wantLogin.hover();
  log('"Want to Login?" hovered');

  const userLogin = page.locator('text=/user login/i');
  await userLogin.waitFor({ timeout: 20000 });
  await userLogin.click();

  log('"User Login" clicked');

  await page.waitForURL(/LoginUserProfilePage\.aspx/, {
    timeout: 60000
  });

  log('Reached LoginUserProfilePage.aspx');
}

module.exports = { homeFlow };
