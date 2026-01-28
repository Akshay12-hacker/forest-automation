const { launchBrowser } = require('./browser/launch');
const { log } = require('./utils/logger');

const { homeFlow } = require('./flows/home.flow');
const { ensureLoggedIn } = require('./utils/sessionController');
const { dashboardFlow } = require('./flows/dashboard.flow');
const { bookingLoop } = require('./utils/bookingLoop');

const bookingFlow = async (page) => {
  await dashboardFlow(page);
  // Phase 5 will be plugged here
};

(async () => {
  log('🟢 Application started — Phase 4');

  const { page } = await launchBrowser();

  await homeFlow(page);
  await ensureLoggedIn(page);

  await bookingLoop(page, bookingFlow);

})();
