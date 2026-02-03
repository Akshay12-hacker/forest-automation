const { log } = require('../utils/logger');
const { readTourists } = require('../utils/readTourists');

async function phase8FormFlow(page) {
  log('🧾 Phase 8: Filling permit form from Excel');

  // HARD SESSION CHECK
  await page.locator('#ctl00_dd').waitFor({ timeout: 10000 });

  const tourists = readTourists();

  for (let i = 0; i < tourists.length; i++) {
    const t = tourists[i];
    const row = i + 1;

    await page.fill(`#txtTouristName_${row}`, t.name);
    await page.selectOption(`#ddlGender_${row}`, t.gender);
    await page.fill(`#txtAge_${row}`, String(t.age));
    await page.fill(`#txtFatherName_${row}`, t.father);
    await page.selectOption(`#ddlNationality_${row}`, t.nationality);
    await page.selectOption(`#ddlIdType_${row}`, t.id_type);
    await page.fill(`#txtIdNumber_${row}`, t.id_number);

    log(`✅ Tourist ${row} filled`);
  }

  // Children below 5 → No
  const childSelect = page.locator('select[name*="ChildBelow5"]');
  if (await childSelect.count()) {
    await childSelect.selectOption('No');
  }

  // Declaration checkbox
  const declaration = page.locator('input[type="checkbox"]');
  await declaration.check();

  log('✅ Declaration accepted');

  log('⏸️ FORM COMPLETE — solve captcha & click Book Your Permit manually');
  await page.pause();
}

module.exports = { phase8FormFlow };
