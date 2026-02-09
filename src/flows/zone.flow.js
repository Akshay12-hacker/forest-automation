const { log } = require('../utils/logger');

async function zoneFlow(page) {
  log('🧭 Phase 7: Smart slot selection (MAX seats)');

  // Wait for result table
  await page.waitForSelector('#searchResult', { timeout: 30000 });
  log('📊 Search result table loaded');

  // Handle manual retry if no slots
  let slots = page.locator('.avail a');
  let count = await slots.count();

  if (count === 0) {
    log('⚠️ No slots available');
    log('👉 Please manually change date / shift and click Search');

    await page.waitForFunction(() => {
      return document.querySelectorAll('.avail a').length > 0;
    }, { timeout: 0 });

    log('🔄 New slots detected after manual change');
    slots = page.locator('.avail a');
    count = await slots.count();
  }

  log(`🔎 Available slot anchors found: ${count}`);

  // 🔍 Find slot with MAX seats
  let maxSeats = -1;
  let bestIndex = 0;

  for (let i = 0; i < count; i++) {
    const slot = slots.nth(i);

    const text = (await slot.innerText()).trim();
    const seats = parseInt(text, 10);

    if (!isNaN(seats)) {
      log(`➡️ Slot ${i + 1}: ${seats} seats`);
      if (seats > maxSeats) {
        maxSeats = seats;
        bestIndex = i;
      }
    }
  }

  if (maxSeats <= 0) {
    throw new Error('❌ Slots found but seat count invalid');
  }

  log(`🏆 Selecting slot with MAX seats: ${maxSeats}`);

  // Click best slot
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    slots.nth(bestIndex).click()
  ]);

  log('✅ Slot clicked successfully');
  return true;
}

module.exports = { zoneFlow };
