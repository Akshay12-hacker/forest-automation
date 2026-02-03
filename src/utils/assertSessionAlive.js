const { log } = require('./logger');

async function assertSessionAlive(page) {
  const url = page.url();

  // ❌ Still on slot-bound login page
  if (url.includes('LoginUserProfilePage.aspx')) {
    throw new Error('⛔ Still on LoginUserProfilePage — do NOT automate yet');
  }

  // ❌ Logged out silently
  const profile = page.locator('#ctl00_dd');
  if (await profile.count() === 0) {
    throw new Error('⛔ Session lost — profile dropdown missing');
  }

  log('✅ Session verified — proceeding to Phase 8');
}

module.exports = { assertSessionAlive };
