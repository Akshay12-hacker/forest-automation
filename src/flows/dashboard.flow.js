const { log } = require('../utils/logger');

async function dashboardFlow(page) {
  log('Phase 4: Dashboard flow started');

  // Ensure we are on dashboard
  await page.waitForURL(/DashBoardHome\.aspx/, {
    timeout: 30000
  });

  log('Dashboard page detected');

  // 🔹 Wait for Book Permit option
  const bookPermit = page.locator(
    'a',{hasText: 'Book Permit'}
  );

  await bookPermit.waitFor({ timeout: 30000 });
  log('"Book Permit" option found');

  // Click Book Permit
  await bookPermit.click();
  log('"Book Permit" clicked');

  // Wait for navigation away from dashboard
  await page.waitForURL(url => !url.includes('DashBoardHome.aspx'), {
    timeout: 30000
  });

  log('Successfully exited dashboard to permit flow');
}

module.exports = { dashboardFlow };
