const { log } = require('../utils/logger');
const { readTouristsCsv } = require('../utils/readTouristsCsv');

/**
 * PHASE 8 – FULL VEHICLE FORM FLOW
 */
async function phase8FullVehicleFlow(page) {
  log('🧾 Phase 8: Permit form flow started');

  // 🛡 HARD GUARD — FORM + ASP.NET STATE
  // ✅ HARD BUT REALISTIC ASP.NET GUARD
await page.waitForSelector('form#form1', { timeout: 0 });

await page.locator('input[name="__VIEWSTATE"]').waitFor({
  state: 'attached',
  timeout: 0
});

log('🔐 Permit form ready (real-world ASP.NET check)');


  // ⚠️ Close Attention popup if exists
  const popup = page.locator('#popupNotice');
  if (await popup.isVisible().catch(() => false)) {
    log('⚠️ Attention popup detected — closing');
    await page.locator('#popupNotice .closePopUp').click();
    await page.waitForTimeout(500);
  }

  // 🚪 Entry Gate (mandatory)
  await page.selectOption('#DDLEntryGate', { index: 1 });
  log('🚪 Entry gate selected');

  // 👥 Load tourists from CSV
  const tourists = readTouristsCsv();

  if (!tourists || tourists.length === 0) {
    throw new Error('❌ No tourists found in CSV');
  }

  // 🔍 Detect actual rows present on page
  const availableRows = await page.locator('[id^="txtVisitorsNameFull"]').count();
  log(`🧠 Visitor rows detected on page: ${availableRows}`);

  const max = Math.min(tourists.length, availableRows, 6);

  log(`👥 Filling ${max} tourist(s)`);

  // ✍️ Fill rows
  for (let i = 0; i < max; i++) {
    await fillFullVehicleRow(page, i, tourists[i]);
  }

  // 📱 Mobile confirmation (required to unlock submit)
  const mobile = page.locator('#txtAlertMobileNumber');
  if (await mobile.isVisible()) {
    await mobile.click();
    await mobile.press('ArrowRight');
    log('📱 Mobile confirmed');
  }

  // ☑️ Declaration
  const declaration = page.locator('#ChkDeclaration');
  if (!(await declaration.isChecked())) {
    await declaration.check();
  }
  log('☑️ Declaration checked');

  // ⚠️ Register dialog handler ONCE
  page.once('dialog', async dialog => {
  log(`⚠️ Alert detected: ${dialog.message()}`);
  await dialog.accept();
});


  // 🛑 STOP — CAPTCHA + SUBMIT MUST BE MANUAL
  log('🛑 CAPTCHA detected — manual action required');
  log('👉 Complete CAPTCHA and click "Book Your Permit" manually');
}

/**
 * Fill FULL VEHICLE tourist row
 * ID type is FORCED to OTHER (Aadhaar-safe)
 */
async function fillFullVehicleRow(page, index, data) {
  const suffix = index === 0 ? '' : index - 1;

  await page.fill(`#txtVisitorsNameFull${suffix}`, data.name);
  await page.selectOption(`#drpGenderfULL${suffix}`, data.gender);
  await page.fill(`#txtAgefULL${suffix}`, String(data.age));
  await page.fill(`#txtFatherHusbandNamefULL${suffix}`, data.guardian);
  await page.selectOption(`#DrpNationalityfULL${suffix}`, data.nationality);

  // ID Proof — EXACT SAME suffix
  await page.selectOption(`#textIdProoffULL${suffix}`, data.idType);
  await page.fill(`#textIdProofNofULL${suffix}`, data.idNumber);

  log(`👤 Tourist ${index + 1} filled`);
  await page.waitForTimeout(300);
}




module.exports = { phase8FullVehicleFlow };
