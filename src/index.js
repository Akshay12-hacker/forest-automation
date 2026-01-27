const { launchBrowser } = require('./browser/launch');
const { log } = require('./utils/logger');
const { homeFlow } = require('./flows/home.flow');
const { ensureLoggedIn } = require('./utils/sessionController');
const { bookingLoop } = require('./utils/bookingLoop');

// this will later include traveller + captcha + otp + payment
const bookingFlow = async (page) => {
  // placeholder for now
  log('Booking flow placeholder');
};

(async () => {
  log('🟢 Application started — Multi-booking session mode');

  const { page } = await launchBrowser();

  await homeFlow(page);          // homepage → user login page
  await ensureLoggedIn(page);    // login ONCE

  await bookingLoop(page, bookingFlow);

  log('ℹ️ Script finished. Browser still open.');
})();
