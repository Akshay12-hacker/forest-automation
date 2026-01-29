const { log } = require('../utils/logger');

async function dashboardFlow(page) {
  log('Phase 4: Dashboard flow started');

  // ✅ Ensure dashboard by URL CHECK, not wait
  if (!page.url().includes('DashBoardHome.aspx')) {
    await page.waitForURL(/DashBoardHome\.aspx/, { timeout: 30000 });
  }

  log('Dashboard page confirmed');

  // 🔥 Click as SOON as visible (not after full load)
  const bookPermitLink = page.locator('a:has-text("Book Permit")');

  await bookPermitLink.waitFor({
    state: 'visible',
    timeout: 30000
  });

  await bookPermitLink.click();
  log('"Book Permit" sidebar link clicked immediately when visible');

  // ❌ DO NOT wait for full load
  // Let next phase decide what to wait for
}

module.exports = { dashboardFlow };
