const { launchBrowser } = require('./browser/launch');
const { log } = require('./utils/logger');
const { homeFlow } = require('./flows/home.flow');
const { ensureLoggedIn } = require('./utils/sessionController');
const { dashboardFlow } = require('./flows/dashboard.flow');
const { permitFlow } = require('./flows/permit.flow');
const { bookingLoop } = require('./utils/bookingLoop');
const { zoneFlow} = require('./flows/zone.flow');
const {phase8FullVehicleFlow} = require('./flows/form.flow.fullVehicle')
const {phase8SingleSeatFlow} = require('./flows/form.flow.singleSeat')
const {getResumePhase, clearResumePhase} = require('./utils/control')



const bookingFlow = async (page) => {
  const resumePhase = getResumePhase();

  if (resumePhase === "PHASE_7") {
    log("🔁 Resuming from Phase 7");
    clearResumePhase();
    await zoneFlow(page);
    return;
  }

  if (resumePhase === "PHASE_8_FULL") {
    log("🔁 Resuming Full Vehicle Phase 8");
    clearResumePhase();
    await phase8FullVehicleFlow(page);
    return;
  }

  if (resumePhase === "PHASE_8_SINGLE") {
    log("🔁 Resuming Single Seat Phase 8");
    clearResumePhase();
    await phase8SingleSeatFlow(page);
    return;
  }
  const url = page.url();

  if (url.includes('DashBoardHome.aspx')) {
    await dashboardFlow(page);
  }

  await permitFlow(page);              // Phase 6
  const slotSelected = await zoneFlow(page); // Phase 7
  if (!slotSelected) return;

  let nextUrl = page.url();

  // 🔄 Handle intermediate profile page
  if (nextUrl.includes('LoginUserProfilePage.aspx')) {
    log('🔄 Profile transition page detected');

    // 🔑 ROUTE USING URL PARAM
    if (nextUrl.includes('TicketType=S')) {
      log('🎫 TicketType=S → Single Seat Phase 8');
      await phase8SingleSeatFlow(page);
      return;
    }

    if (nextUrl.includes('TicketType=N')) {
      log('🚙 TicketType=N → Full Vehicle Phase 8');
      await phase8FullVehicleFlow(page);
      return;
    }

    throw new Error(`❌ Unknown TicketType in URL: ${nextUrl}`);
  }

  // 🧯 Fallback (should rarely hit)
  if (nextUrl.includes('SingleSeat')) {
    await phase8SingleSeatFlow(page);
    return;
  }

  if (nextUrl.includes('Booking') || nextUrl.includes('ProcessToPayment')) {
    await phase8FullVehicleFlow(page);
    return;
  }

  throw new Error(`❌ Unknown Phase 8 page: ${nextUrl}`);
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
