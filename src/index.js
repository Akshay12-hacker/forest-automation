const { launchBrowser } = require('./browser/launch');
const { log } = require('./utils/logger');
const { homeFlow } = require('./flows/home.flow');
const { ensureLoggedIn } = require('./utils/sessionController');
const { dashboardFlow } = require('./flows/dashboard.flow');
const { permitFlow } = require('./flows/permit.flow');
const { bookingLoop } = require('./utils/bookingLoop');
const { zoneFlow } = require('./flows/zone.flow');
const { phase8FullVehicleFlow } = require('./flows/form.flow.fullVehicle');
const { phase8SingleSeatFlow } = require('./flows/form.flow.singleSeat');
const { phase9OtpAndPaymentFlow } = require('./flows/form.flow.OtpPayment');
const { getResumePhase, clearResumePhase } = require('./utils/control');

async function waitForOtpStage(page) {
  log('Waiting for manual CAPTCHA/book action to reach OTP step');

  await Promise.race([
    page.waitForSelector('#txtOTP', { timeout: 0 }),
    page.waitForSelector('#btnOTPServer', { timeout: 0 }),
    page.waitForFunction(
      () => {
        const href = window.location.href.toLowerCase();
        return (
          href.includes('otp') ||
          href.includes('payment') ||
          href.includes('processtopayment')
        );
      },
      { timeout: 0 }
    ),
  ]);

  log('OTP/payment step detected');
}

const bookingFlow = async (page) => {
  if (!page || typeof page.url !== 'function') {
    throw new Error('Invalid page object provided to bookingFlow');
  }

  const resumePhase = getResumePhase();

  if (resumePhase === 'PHASE_7') {
    log('Resuming from Phase 7');
    clearResumePhase();
    await zoneFlow(page);
    return;
  }

  if (resumePhase === 'PHASE_8_FULL') {
    log('Resuming Full Vehicle Phase 8');
    clearResumePhase();
    await phase8FullVehicleFlow(page);
    await waitForOtpStage(page);
    await phase9OtpAndPaymentFlow(page);
    return;
  }

  if (resumePhase === 'PHASE_8_SINGLE') {
    log('Resuming Single Seat Phase 8');
    clearResumePhase();
    await phase8SingleSeatFlow(page);
    await waitForOtpStage(page);
    await phase9OtpAndPaymentFlow(page);
    return;
  }

  const url = await page.url();

  if (url.includes('DashBoardHome.aspx')) {
    await dashboardFlow(page);
  }

  await permitFlow(page);
  const slotSelection = await zoneFlow(page);
  if (!slotSelection || !slotSelection.selected) return;

  const nextUrl = await page.url();

  if (nextUrl.includes('LoginUserProfilePage.aspx')) {
    log('Profile transition page detected');

    if (nextUrl.includes('TicketType=S')) {
      log('TicketType=S -> Single Seat Phase 8');
      await phase8SingleSeatFlow(page);
      await waitForOtpStage(page);
      await phase9OtpAndPaymentFlow(page);
      return;
    }

    if (nextUrl.includes('TicketType=N')) {
      log('TicketType=N -> Full Vehicle Phase 8');
      await phase8FullVehicleFlow(page, {
        selectedSeatCapacity: slotSelection.maxSeats,
      });
      await waitForOtpStage(page);
      await phase9OtpAndPaymentFlow(page);
      return;
    }

    throw new Error(`Unknown TicketType in URL: ${nextUrl}`);
  }

  if (nextUrl.includes('SingleSeat')) {
    await phase8SingleSeatFlow(page);
    await waitForOtpStage(page);
    await phase9OtpAndPaymentFlow(page);
    return;
  }

  if (nextUrl.includes('Booking') || nextUrl.includes('ProcessToPayment')) {
    await phase8FullVehicleFlow(page, {
      selectedSeatCapacity: slotSelection.maxSeats,
    });
    await waitForOtpStage(page);
    await phase9OtpAndPaymentFlow(page);
    return;
  }

  throw new Error(`Unknown Phase 8 page: ${nextUrl}`);
};

(async () => {
  try {
    log('Application started');

    const launchResult = await launchBrowser();
    if (!launchResult || !launchResult.page) {
      throw new Error('launchBrowser did not return a valid page');
    }
    const { page } = launchResult;

    const homeState = await homeFlow(page);
    if (!homeState || typeof homeState.needsLogin !== 'boolean') {
      throw new Error('homeFlow returned an invalid state');
    }

    if (homeState.needsLogin) {
      const loggedIn = await ensureLoggedIn(page);
      if (!loggedIn) {
        log('Login failed. Exiting.');
        process.exit(1);
      }
    } else {
      await ensureLoggedIn(page);
    }

    await bookingLoop(page, bookingFlow);
  } catch (err) {
    log(`Fatal Error: ${err && err.message ? err.message : err}`);
    process.exit(1);
  }
})();
