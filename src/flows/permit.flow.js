const { log } = require('../utils/logger');
const {waitIfPaused } = require('../utils/control')

async function permitFlow(page) {
  await waitIfPaused();

  // 1️⃣ Ensure we are on homepage
  if (!page.url().includes('forest.mponline.gov.in')) {
    await page.goto('https://forest.mponline.gov.in/', {
      waitUntil: 'domcontentloaded',
    });
  }

  // 2️⃣ Hover Book Now
  await page.locator('#imgBookNow').hover();

  // 3️⃣ Open Tiger Reserve map
  await page.evaluate(() => showSubMenus('TigerReserve'));

  log('🗺️ Tiger Reserve map opened');
  log('👉 Please click Bandhavgarh (or desired park) manually');

  // 4️⃣ Wait until user reaches ANY permit page
  await page.waitForURL(
  url => {
    const u = url.toString();
    return (
      u.includes('SingleSeatSearch.aspx') ||
      u.includes('searchNew.aspx')
    );
  },
  { timeout: 0 }
);


  const currentUrl = page.url();
  log(`📍 User landed on: ${currentUrl}`);

  // 🛑 CASE 1: SINGLE SEAT — STOP
  if (currentUrl.includes('SingleSeatSearch.aspx')) {
    log('🛑 Single Seat flow detected');
    log('ℹ️ No Full Vehicle / Date automation for Single Seat');
    return;
  }

  // ✅ CASE 2: PREMIUM TATKAL — AUTOMATE
  if (currentUrl.includes('searchNew.aspx')) {
    log('🚀 Premium Tatkal flow detected — automating');

    // Select Full Vehicle
    await page.locator('#rdFullVehicle').check();
    log('✅ Permit Type: Full Vehicle');

    // Date = today + 7 days
    const future = new Date();
    future.setDate(future.getDate() + 7);

    const formattedDate = future.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Date input is readonly → inject
    await page.evaluate(date => {
      document.querySelector('#txtdate').value = date;
      document.querySelector('#hidtempdate').value = date;
    }, formattedDate);

    log(`📅 Date selected: ${formattedDate}`);

    // Click Search
    await page.locator('#btnshow').click();
    log('🔍 Search button clicked');

    return;
  }

  // ❌ SAFETY NET
  throw new Error(`Unknown permit page reached: ${currentUrl}`);
}

module.exports = { permitFlow };
