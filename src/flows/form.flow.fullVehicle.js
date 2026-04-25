const { log } = require('../utils/logger');
const { readTouristsCsv } = require('../utils/readTouristsCsv');
const { solveArithmeticCaptcha } = require('../utils/captchaSolver');

/**
 * Phase 8 - Full vehicle form flow.
 */
async function phase8FullVehicleFlow(page, options = {}) {
  log('Phase 8: Permit form flow started');

  await page.waitForSelector('form#form1', { timeout: 0 });
  await page.locator('input[name="__VIEWSTATE"]').waitFor({
    state: 'attached',
    timeout: 0,
  });

  log('Permit form ready');

  const popup = page.locator('#popupNotice');
  if (await popup.isVisible().catch(() => false)) {
    log('Attention popup detected, closing it');
    await page.locator('#popupNotice .closePopUp').click();
    await page.waitForTimeout(500);
  }

  await page.selectOption('#DDLEntryGate', { index: 1 });
  log('Entry gate selected');

  const tourists = readTouristsCsv();
  if (!tourists || tourists.length === 0) {
    throw new Error('No tourists found in CSV');
  }

  const availableRows = await page.locator('[id^="txtVisitorsNameFull"]').count();
  log(`Visitor rows detected on page: ${availableRows}`);

  const selectedVehicleCount = Number.isFinite(options.selectedSeatCapacity)
    ? options.selectedSeatCapacity
    : null;

  if (selectedVehicleCount !== null) {
    log(`Search result selected vehicle count: ${selectedVehicleCount}`);
  }

  const max = Math.min(tourists.length, availableRows, 6);

  log(`Filling ${max} tourist(s)`);

  for (let i = 0; i < max; i++) {
    await fillFullVehicleRow(page, i, tourists[i]);
  }

  const mobile = page.locator('#txtAlertMobileNumber');
  if (await mobile.isVisible()) {
    await mobile.click();
    await mobile.press('ArrowRight');
    log('Mobile confirmed');
  }

  const declaration = page.locator('#ChkDeclaration');
  if (!(await declaration.isChecked())) {
    await declaration.check();
  }
  log('Declaration checked');

  page.once('dialog', async (dialog) => {
    log(`Alert detected: ${dialog.message()}`);
    await dialog.accept();
  });

  log('Solving CAPTCHA automatically...');
  let maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
          const captchaInput = page.locator('#txtCaptchatext');
          if (await captchaInput.isVisible({ timeout: 2000 }).catch(() => false)) {
              const answer = await solveArithmeticCaptcha(page, '#imgCaptcha');
              await captchaInput.fill(answer);
              log(`Captcha filled successfully (Attempt ${attempt})`);
              
              const bookBtn = page.locator('input[value*="Book Your Permit"], input[id*="btnSubmit"]');
              if (await bookBtn.first().isVisible()) {
                  await bookBtn.first().click();
                  log('Book Your Permit button clicked');
                  
                  try {
                      await page.waitForSelector('#dvErr, .error', { state: 'visible', timeout: 3000 });
                      const errText = await page.locator('#dvErr, .error').innerText();
                      if (errText.toLowerCase().includes('captcha')) {
                          log('⚠️ Captcha was incorrect! Retrying...');
                          continue;
                      }
                  } catch (e) {
                      // No error appeared, success!
                      break;
                  }
              } else {
                  log('Could not find Book Your Permit button automatically.');
                  break;
              }
          } else {
              break;
          }
      } catch (error) {
          log('⚠️ Could not automatically solve captcha: ' + error.message);
      }
  }
}

async function fillFullVehicleRow(page, index, data) {
  const suffix = index === 0 ? '' : index - 1;

  // Run sequentially to prevent focus jumping, which causes chaotic data entry
  await page.fill(`#txtVisitorsNameFull${suffix}`, data.name);
  await page.selectOption(`#drpGenderfULL${suffix}`, data.gender);
  await page.fill(`#txtAgefULL${suffix}`, String(data.age));
  await page.fill(`#txtFatherHusbandNamefULL${suffix}`, data.guardian);
  
  // Nationality might trigger ID Proof dropdown updates
  await page.selectOption(`#DrpNationalityfULL${suffix}`, data.nationality);
  
  // Quick wait for JS side-effect (e.g. locking ID type to Passport for foreigners)
  await page.waitForTimeout(100); 

  await page.selectOption(`#textIdProoffULL${suffix}`, data.idType);
  await page.fill(`#textIdProofNofULL${suffix}`, data.idNumber);

  log(`Tourist ${index + 1} filled`);
}

module.exports = { phase8FullVehicleFlow };
