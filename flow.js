const { log } = require('../utils/logger');
const { readTouristsExcel } = require('../utils/readTouristsExcel');

async function phase8FormFlow(page) {
  log('🧾 Phase 8: Permit form flow started');

  // HARD GUARD
  await page.waitForSelector('form#form1', { timeout: 20000 });
  await page.waitForSelector('#__VIEWSTATE');

  log('✅ Permit form confirmed');

  // Handle Attention popup if present
  const popup = page.locator('#popupNotice');
  if (await popup.isVisible().catch(() => false)) {
    log('⚠️ Closing Attention popup');
    await page.locator('#popupNotice .closePopUp').click();
    await page.waitForTimeout(500);
  }

  // Detect permit type
  const permitText = await page.locator('#lblTicketType').innerText();
  const isFullVehicle = permitText.includes('Full');
  log(`🪪 Permit Type: ${permitText}`);

  // Entry gate (mandatory)
  await page.selectOption('#DDLEntryGate', { index: 1 });
  log('🚪 Entry gate selected');

  // Load tourists from Excel
  const tourists = readTouristsExcel();
  const max = isFullVehicle ? Math.min(tourists.length, 6) : 1;

  log(`👥 Filling ${max} tourist(s)`);

  for (let i = 0; i < max; i++) {
    await fillFullVehicleRow(page, i, tourists[i]);
  }

  // Mobile confirmation
  const mobile = page.locator('#txtAlertMobileNumber');
  await mobile.click();
  await mobile.press('ArrowRight');

  // Declaration
  const declaration = page.locator('#ChkDeclaration');
  if (!(await declaration.isChecked())) {
    await declaration.check();
  }

  log('☑️ Declaration checked');

  // 🚫 STOP BEFORE CAPTCHA
  log('🛑 CAPTCHA detected — complete manually');
  log('👉 After captcha, click "Book Your Permit" yourself');

  // Optional: pause execution
  await page.pause();
}

/**
 * Fill FULL VEHICLE tourist row
 */
async function fillFullVehicleRow(page, index, data) {
  const suffix = index === 0 ? '' : index;

  await page.fill(`#txtVisitorsNameFull${suffix}`, data.name);
  await page.selectOption(`#drpGenderfULL${suffix}`, data.gender);
  await page.fill(`#txtAgefULL${suffix}`, data.age);
  await page.fill(`#txtFatherHusbandNamefULL${suffix}`, data.guardian);
  await page.selectOption(`#DrpNationalityfULL${suffix}`, data.nationality);
  await page.selectOption(`#textIdProoffULL${suffix}`, data.idType);
  await page.fill(`#textIdProofNofULL${suffix}`, data.idNumber);

  log(`👤 Tourist ${index + 1} filled`);
  await page.waitForTimeout(300);
}

module.exports = { phase8FormFlow };
