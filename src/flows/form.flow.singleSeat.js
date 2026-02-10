const { log } = require('../utils/logger');
const { readSingleTouristsCsv } = require('../utils/readSingleTouristsCsv');

async function phase8SingleSeatFlow(page) {
  log('🧾 Phase 8 v2 (Single Seat – sequential) started');

  await page.waitForSelector('form#form1', { timeout: 30000 });

  // Close popup
  const popup = page.locator('#popupNotice');
  if (await popup.isVisible().catch(() => false)) {
    await popup.locator('.closePopUp').click();
    await page.waitForTimeout(500);
  }

  // Entry Gate (mandatory)
  await page.selectOption('#DDLEntryGate', { index: 1 });
  log('Entry gate selected')


  // Load tourists from CSV
  const tourists = readSingleTouristsCsv();
  if (!tourists || tourists.length === 0) {
    throw new Error('❌ No tourists in singleTourist.csv');
  }

  // Seat Selector through jeep img 

  const seats = page.locator('.jeep_divd img[onclick], .jeep_divd div[onclick]');
  let seatIndex = 0;

  for (const tourist of tourists) {
    log(`🎫 Selecting seat for ${tourist.name}`);

    await seats.nth(seatIndex).scrollIntoViewIfNeeded();
    await seats.nth(seatIndex).click();
    seatIndex++;

    // Wait for form to unlock
    await page.waitForSelector('#txtVisitorsName', { timeout: 15000 });

    // Fill SINGLE tourist form
    await page.fill('#txtVisitorsName', tourist.name);
    await page.selectOption('#drpGender', tourist.gender);
    await page.fill('#txtAge', String(tourist.age));
    await page.fill('#txtFatherHusbandName', tourist.guardian);
    await page.selectOption('#DrpNationality', tourist.nationality);

    await page.selectOption('#textIdProof', tourist.idType);
    await page.fill('#textIdProofNo', tourist.idNumber);

    log(`👤 Tourist added: ${tourist.name}`);

    // Trigger ASP.NET internal save
    await page.waitForTimeout(1000);
  }

  // Declaration
  const declaration = page.locator('#ChkDeclaration');
  if (!(await declaration.isChecked())) {
    await declaration.check();
  }

  page.once('dialog', async dialog => {
    log(`⚠️ Alert: ${dialog.message()}`);
    await dialog.accept();
  });

  log('🛑 CAPTCHA + OTP manual');
}

module.exports = { phase8SingleSeatFlow };
