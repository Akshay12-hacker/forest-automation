const { log } = require('../utils/logger');
const { readSingleTouristsCsv } = require('../utils/readSingleTouristsCsv');
const { solveArithmeticCaptcha } = require('../utils/captchaSolver');

async function phase8SingleSeatFlow(page) {
  log('Phase 8 (Single Seat Multi-Vehicle Flow) started');

  // Wait for main form and site JS to be ready
  await page.waitForSelector('form#form1', { timeout: 0 });
  await page.waitForFunction(
    () => typeof addRemoveVisitors === 'function'
  );

  // Close popup if present
  const popup = page.locator('#popupNotice');
  if (await popup.isVisible().catch(() => false)) {
    await popup.locator('.closePopUp').click();
    await page.waitForTimeout(500);
  }

  // Select entry gate
  await page.selectOption('#DDLEntryGate', { index: 1 });
  log('Entry gate selected');

  // Load tourists from CSV
  const tourists = readSingleTouristsCsv();
  if (!tourists || tourists.length === 0) {
    throw new Error('No tourists found in CSV');
  }
  log(`Total tourists to book: ${tourists.length}`);

  // ================================================================
  // STEP 1: DETECT VEHICLE TYPE BY PROBING ACTUAL DOM
  //
  // The page renders EITHER jeep seat divs OR bus seat divs depending
  // on the slot selected. We check what actually exists in the DOM.
  //
  // JEEP layout (6 seats per vehicle, up to 4 vehicles):
  //   V1: MyMainDiv1–6      → ds1(id)
  //   V2: MySecondDiv1–6   → SecondVechile(id)
  //   V3: MythirdhDiv1–6   → ds3(id)
  //   V4: MyfourthDiv1–6   → ds4(id)
  //
  // BUS layout (18 seats per bus div group, up to 2 buses):
  //   Bus1: MyMainDiv1Bus–MyMainDiv18Bus   → Busds1(id)
  //   Bus2: MyMainDiv19Bus–MyMainDiv36Bus  → Busds1(id)  ← same fn!
  // ================================================================

  const isBus = await page.locator('#MyMainDiv1Bus').count() > 0;
  const isJeep = await page.locator('#MyMainDiv1').count() > 0;

  log(`Vehicle type detected: ${isBus ? 'BUS' : isJeep ? 'JEEP' : 'UNKNOWN'}`);

  if (!isBus && !isJeep) {
    // Fallback: dump all div IDs on the page to help diagnose
    const allDivIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div[id]'))
        .map(d => d.id)
        .filter(id => id.toLowerCase().includes('div') || id.toLowerCase().includes('seat'))
        .slice(0, 50)
    );
    log(`Could not detect vehicle type. Sample div IDs: ${JSON.stringify(allDivIds)}`);
    throw new Error('Cannot detect vehicle type — no known seat divs found in DOM');
  }

  let touristIndex = 0;

  if (isBus) {
    // ==============================================================
    // BUS FLOW
    // Busds1() handles ALL bus seats (both Bus1 and Bus2).
    // Bus1 seats: MyMainDiv1Bus → MyMainDiv18Bus  (18 seats)
    // Bus2 seats: MyMainDiv19Bus → MyMainDiv36Bus (18 seats)
    // We only book as many seats as we have tourists.
    // If tourists < seats available, only fill those rows.
    // ==============================================================

    // Build full list of bus seat div IDs in order
    // Bus 1: 1–18, Bus 2: 19–36
    const totalBusSeats = await page.evaluate(() => {
      let count = 0;
      for (let i = 1; i <= 36; i++) {
        if (document.getElementById(`MyMainDiv${i}Bus`)) count++;
      }
      return count;
    });
    log(`Bus seats available in DOM: ${totalBusSeats}`);

    for (let seatNum = 1; seatNum <= totalBusSeats; seatNum++) {
      if (touristIndex >= tourists.length) {
        log(`All ${tourists.length} tourists assigned, stopping seat selection`);
        break;
      }

      const divId = `MyMainDiv${seatNum}Bus`;

      // Check if seat is booked (red background)
      const bgColor = await page.locator(`#${divId}`).evaluate(
        el => el.style.backgroundColor
      ).catch(() => '');

      if (bgColor === 'rgb(255, 0, 0)') {
        log(`Seat ${divId} already booked (red), skipping`);
        continue;
      }

      const beforeRows = await page.locator('#VisitorTable tr').count();

      // Busds1() is the single function for all bus seats
      const success = await page.evaluate((divId) => {
        try {
          Busds1(divId);
          return true;
        } catch (e) {
          console.error('Busds1 error:', e);
          return false;
        }
      }, divId);

      if (!success) {
        log(`Busds1 call failed for ${divId}`);
        continue;
      }

      // Wait for a new row to appear in VisitorTable
      try {
        await page.waitForFunction(
          (prev) => document.querySelectorAll('#VisitorTable tr').length > prev,
          beforeRows,
          { timeout: 3000 }
        );
        log(`Bus seat confirmed: ${divId} → tourist slot ${touristIndex + 1}`);
        touristIndex++;
      } catch {
        // Hit 6-seat limit per permit, or seat was blocked
        const currentRows = await page.locator('#VisitorTable tr').count();
        log(`Row did not appear for ${divId}. Rows: ${currentRows}. Limit hit or blocked.`);
        if (currentRows - 2 >= 6) {
          log('6-seat per permit limit reached');
          break;
        }
      }

      await page.waitForTimeout(200);
    }

  } else {
    // ==============================================================
    // JEEP FLOW
    // 4 vehicles × 6 seats each = max 24 seats possible
    // But per-permit max is 6, enforced by checkSeatAvailability()
    // ==============================================================

    const vehicleConfig = [
      { vehicle: 1, divPrefix: 'MyMainDiv',    jsFn: 'ds1'          },
      { vehicle: 2, divPrefix: 'MySecondDiv',  jsFn: 'SecondVechile' },
      { vehicle: 3, divPrefix: 'MythirdhDiv',  jsFn: 'ds3'          },
      { vehicle: 4, divPrefix: 'MyfourthDiv',  jsFn: 'ds4'          },
    ];

    // FR=1, FC=2, RR=3, FL=4, RC=5, RL=6
    const seatCount = 6;

    for (const vConfig of vehicleConfig) {
      if (touristIndex >= tourists.length) break;

      // Skip this vehicle entirely if its first div doesn't exist
      const firstDivExists = await page.locator(`#${vConfig.divPrefix}1`).count();
      if (!firstDivExists) {
        log(`Vehicle ${vConfig.vehicle} (${vConfig.divPrefix}1) not in DOM, skipping`);
        continue;
      }

      log(`--- Vehicle ${vConfig.vehicle} (${vConfig.divPrefix}) ---`);

      for (let seatNum = 1; seatNum <= seatCount; seatNum++) {
        if (touristIndex >= tourists.length) break;

        const divId = `${vConfig.divPrefix}${seatNum}`;

        const bgColor = await page.locator(`#${divId}`).evaluate(
          el => el.style.backgroundColor
        ).catch(() => '');

        if (bgColor === 'rgb(255, 0, 0)') {
          log(`Seat ${divId} booked (red), skipping`);
          continue;
        }

        const beforeRows = await page.locator('#VisitorTable tr').count();

        const success = await page.evaluate(({ fnName, divId }) => {
          try {
            window[fnName](divId);
            return true;
          } catch (e) {
            return false;
          }
        }, { fnName: vConfig.jsFn, divId });

        if (!success) {
          log(`JS function ${vConfig.jsFn}('${divId}') failed`);
          continue;
        }

        try {
          await page.waitForFunction(
            (prev) => document.querySelectorAll('#VisitorTable tr').length > prev,
            beforeRows,
            { timeout: 3000 }
          );
          log(`Jeep seat confirmed: ${divId} → tourist slot ${touristIndex + 1}`);
          touristIndex++;
        } catch {
          const currentRows = await page.locator('#VisitorTable tr').count();
          log(`Row not created for ${divId}. Current rows: ${currentRows}`);
          if (currentRows - 2 >= 6) {
            log('6-seat limit reached for this permit');
            break;
          }
        }

        await page.waitForTimeout(200);
      }
    }
  }

  if (touristIndex === 0) {
    throw new Error('No seats were successfully selected');
  }
  log(`Total seats selected: ${touristIndex}`);

  // ================================================================
  // STEP 2: FILL TOURIST DETAILS
  // Rows 0 & 1 are headers, data rows start at index 2
  // We only fill as many rows as we have tourists (touristIndex)
  // ================================================================

  const rows = page.locator('#VisitorTable tr');
  const rowCount = await rows.count();
  log(`VisitorTable rows: ${rowCount} (2 headers + ${rowCount - 2} data rows)`);

  if (rowCount <= 2) {
    throw new Error('No tourist rows were created in VisitorTable');
  }

  // Fill only rows we have tourist data for — handles partial bookings
  // e.g. 9-seat bus but only 6 tourists in CSV
  const max = Math.min(touristIndex, rowCount - 2, tourists.length);
  log(`Filling ${max} tourist rows`);

  for (let i = 0; i < max; i++) {
    const tourist = tourists[i];
    const row = rows.nth(i + 2);

    log(`Filling row ${i + 1}: ${tourist.name} | ${tourist.nationality} | Age ${tourist.age}`);

    // Sequential to prevent focus-jumping
    await row.locator('input[id^="txtVisitorsName"]').fill(tourist.name);
    await row.locator('select[id^="drpGender"]').selectOption(tourist.gender);
    
    const ageInput = row.locator('input[id^="txtAge_"]');
    await ageInput.fill(String(tourist.age));
    await ageInput.blur(); // triggers calculateFeeOnNationalitySelect
    
    await row.locator('input[id^="txtFatherHusbandName"]').fill(tourist.guardian);
    await row.locator('select[id^="DrpNationality"]').selectOption(tourist.nationality);
    
    // Wait for JS side-effects (e.g. setIDCardType locking foreigner to Passport)
    await page.waitForTimeout(150);

    const idTypeSelect = row.locator('select[id^="textIdProof"]');
    const isDisabled = await idTypeSelect.isDisabled().catch(() => false);
    if (!isDisabled) {
      await idTypeSelect.selectOption(tourist.idType);
    } else {
      log(`  Row ${i + 1}: ID type auto-locked (foreigner → Passport)`);
    }

    await row.locator('input[id^="textIdProofNo"]').fill(tourist.idNumber);
  }

  log('All tourist details filled');

  // ================================================================
  // STEP 3: MOBILE NUMBER (required by getTableData validation)
  // ================================================================
  const mobileField = page.locator('#txtAlertMobileNumber');
  if (await mobileField.count()) {
    const existingMobile = await mobileField.inputValue().catch(() => '');
    const csvMobile = tourists[0].mobile || '';

    if (existingMobile.trim()) {
      log('Mobile number already present, keeping autofilled value');
    } else if (csvMobile.trim()) {
      await mobileField.fill(csvMobile);
      log('Mobile number filled from CSV');
    } else {
      log('Mobile number not filled automatically');
    }
  }

  // ================================================================
  // STEP 4: DECLARATION CHECKBOX
  // ================================================================
  const declaration = page.locator('#ChkDeclaration');
  if (await declaration.count() && !(await declaration.isChecked())) {
    await declaration.check();
    log('Declaration checked');
  }

  // ================================================================
  // STEP 5: PRE-REGISTER DIALOG HANDLER
  // validateTouristFull() fires confirm() dialogs — must be registered
  // BEFORE submit is clicked, not after
  // ================================================================
  page.on('dialog', async (dialog) => {
    log(`Dialog: "${dialog.message().substring(0, 80)}..."`);
    await dialog.accept();
    log('Dialog accepted');
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

module.exports = { phase8SingleSeatFlow };
