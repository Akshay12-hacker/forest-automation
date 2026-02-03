const { log } = require('../utils/logger');

async function zoneFlow(page) {
  log('🧭 Phase 7: Safe slot selection (CLICK only)');

  // Wait for results table, NOT for availability
  await page.waitForSelector('#searchResult', { timeout: 30000 });
  log('📊 Search result table loaded');

  const slots = page.locator('.avail a');
  const count = await slots.count();

  log(`🔎 Available slot anchors found: ${count}`);

  if (count === 0) {
    log('⚠️ No slots available for selected date/permit');
    return false; // 👈 IMPORTANT
  }

  // Click first available slot
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    slots.first().click()
  ]);

  log('✅ Slot clicked successfully');
  return true;
}

module.exports = { zoneFlow };
