const { log } = require('../utils/logger');

async function permitSearchFlow(page) {
  log('Phase 6: Permit search flow started');

  // Wait until we arrive at the quick search page
  await page.waitForURL(/Search\.aspx\?park=\d+/, {
    timeout: 60000
  });

  log('🔹 Quick search page loaded — please click either Single Seat or Premium Tatkal manually');

  // Pause for the user to select option
  await page.pause();

  // After user clicks, wait for the search form to load
  await page.waitForURL(/Search\.aspx/, { timeout: 60000 });

  log('👣 User made selection — now automating the form');

  // Select "Full Vehicle"
  await page.locator('#rdFullVehicle').check();
  log('Selected Permit Type: Full Vehicle');

  // Set date (today + 7 days)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const formattedDate = futureDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Fill date via JavaScript since the input is readonly
  await page.evaluate((dateStr) => {
    const input = document.querySelector('#txtdate');
    input.value = dateStr;
    document.querySelector('#hidtempdate').value = dateStr;
  }, formattedDate);

  log(`📅 Date set to: ${formattedDate}`);

  // Click Search
  await page.locator('#btnshow').click();
  log('🔎 Search button clicked');

  // Wait for results
  await page.waitForSelector('#searchResult', { timeout: 30000 });
  log('✅ Permit search executed successfully');
}

module.exports = { permitSearchFlow };
