const { log } = require('../utils/logger');
const { readSingleTouristsCsv } = require('../utils/readSingleTouristsCsv');

async function phase8SingleSeatFlow(page) {
  log('Phase 8 (Full Multi-Vehicle Flow) started');

  // Wait for main form
  await page.waitForSelector('form#form1', { timeout: 0 });

  // Wait until site JS is ready
  await page.waitForFunction(() => typeof addRemoveVisitors === 'function');

  // Close popup if present
  const popup = page.locator('#popupNotice');
  if (await popup.isVisible().catch(() => false)) {
    await popup.locator('.closePopUp').click();
    await page.waitForTimeout(500);
  }

  // Select entry gate
  await page.selectOption('#DDLEntryGate', { index: 1 });
  log('Entry gate selected');

  // Load tourists
  const tourists = readSingleTouristsCsv();
  if (!tourists || tourists.length === 0) {
    throw new Error('No tourists found in CSV');
  }

  // ================================
  // 🔥 STEP 1: SELECT ALL SEATS
  // ================================
  const seatCodes = ['FR', 'FC', 'RR', 'FL', 'RC', 'RL'];

  let touristIndex = 0;
  let vehicle = 1;

  while (touristIndex < tourists.length) {
    let seatsAddedThisVehicle = 0;

    for (let i = 0; i < seatCodes.length; i++) {
      if (touristIndex >= tourists.length) break;

      const seat = `V${vehicle}:${seatCodes[i]}`;
      log(`Trying seat: ${seat}`);

      const beforeRows = await page.locator('#VisitorTable tr').count();

      const success = await page.evaluate((seat) => {
        try {
          return addRemoveVisitors('Add', seat);
        } catch {
          return false;
        }
      }, seat);

      if (!success) {
        log(`Seat blocked/unavailable: ${seat}`);
        continue;
      }

      try {
        await page.waitForFunction(
          (prev) => document.querySelectorAll('#VisitorTable tr').length > prev,
          beforeRows,
          { timeout: 2000 }
        );

        log(`Seat added: ${seat}`);

        touristIndex++;
        seatsAddedThisVehicle++;

      } catch {
        log(`Seat click ignored: ${seat}`);
      }

      await page.waitForTimeout(150);
    }

    // Prevent infinite loop
    if (seatsAddedThisVehicle === 0) {
      log(`No seats worked in vehicle V${vehicle}, stopping`);
      break;
    }

    vehicle++;
  }

  // ================================
  // 🔥 STEP 2: FILL TOURIST DETAILS
  // ================================
  const rows = page.locator('#VisitorTable tr');
  const rowCount = await rows.count();

  if (rowCount <= 2) {
    throw new Error('No tourist rows created');
  }

  const max = Math.min(tourists.length, rowCount - 2);

  for (let i = 0; i < max; i++) {
    const tourist = tourists[i];
    const row = rows.nth(i + 2);

    log(`Filling tourist ${i + 1}: ${tourist.name}`);

    await row.locator('input[id^="txtVisitorsName"]').fill(tourist.name);
    await row.locator('select[id^="drpGender"]').selectOption(tourist.gender);
    await row.locator('input[id^="txtAge"]').fill(String(tourist.age));
    await row.locator('input[id^="txtFatherHusbandName"]').fill(tourist.guardian);
    await row.locator('select[id^="DrpNationality"]').selectOption(tourist.nationality);
    await row.locator('select[id^="textIdProof"]').selectOption(tourist.idType);
    await row.locator('input[id^="textIdProofNo"]').fill(tourist.idNumber);

    await page.waitForTimeout(150);
  }

  // ================================
  // 🔥 STEP 3: DECLARATION
  // ================================
  const declaration = page.locator('#ChkDeclaration');
  if (!(await declaration.isChecked())) {
    await declaration.check();
  }

  // ================================
  // 🔥 STEP 4: HANDLE ALERTS
  // ================================
  page.once('dialog', async dialog => {
    log(`Alert: ${dialog.message()}`);
    await dialog.accept();
  });

  log('CAPTCHA + OTP manual step remaining');
}

module.exports = { phase8SingleSeatFlow };