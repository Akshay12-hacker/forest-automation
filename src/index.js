const { launchBrowser } = require('./browser/launch');
const { log } = require('./utils/logger');
const { homeFlow } = require('./flows/home.flow');
const { ensureLoggedIn } = require('./utils/sessionController');
const { dashboardFlow } = require('./flows/dashboard.flow');
const { permitFlow } = require('./flows/permit.flow');
const { bookingLoop } = require('./utils/bookingLoop');
const { zoneFlow} = require('./flows/zone.flow');
const { assertSessionAlive } = require('./utils/assertSessionAlive');
const { phase8FormFlow } = require('./flows/form.flow');


const bookingFlow = async (page) => {
  const url = page.url();

  if (url.includes('DashBoardHome.aspx')) {
    await dashboardFlow(page);
  }

  await permitFlow(page);     // Phase 7
  await zoneFlow(page);
  await assertSessionAlive(page);
  await phase8FormFlow(page);
};


(async () => {
  log('🟢 Application started');

  const { page } = await launchBrowser();

  const homeState = await homeFlow(page);

  // 🔒 SINGLE LOGIN GATE
  if (homeState.needsLogin) {
    const loggedIn = await ensureLoggedIn(page);
    if (!loggedIn) {
      log('❌ Login failed. Exiting.');
      process.exit(1);
    }
  } else {
    // Even if login button not visible, still verify session
    await ensureLoggedIn(page);
  }

  // 🚀 ONLY AFTER LOGIN
  await bookingLoop(page, bookingFlow);
})();
