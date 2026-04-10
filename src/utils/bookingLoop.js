const readline = require('readline');
const { log } = require('../utils/logger');
const { waitIfPaused } = require('../utils/control');

function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(question, ans => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    });
  });
}

async function bookingLoop(page, bookingFlow) {
  let count = 1;

  while (true) {
    log(`🚀 Starting booking #${count}`);
    await waitIfPaused();

    try {
      await bookingFlow(page); // traveller → captcha → otp → payment
    } catch (err) {
      log(`❌ Booking #${count} failed: ${err && err.message ? err.message : err}`);
      throw err;
    }

    log(`✅ Booking #${count} completed`);

    const ans = await ask('Do you want to create another permit? (y/n): ');
    if (ans !== 'y') {
      log('🛑 Booking session ended by officer');
      break;
    }

    count++;
  }

  log('ℹ️ Session still active. Close browser to logout.');
}

module.exports = { bookingLoop };
