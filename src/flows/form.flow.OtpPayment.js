/**
 * Phase 9: OTP Verification + Payment Flow
 *
 * PAGE STRUCTURE (from HTML analysis):
 *   - #TrOTP (visible)           → OTP input row
 *   - #txtOTP                    → password input, maxlength=6
 *   - #btnVerifyServer           → "Verify OTP" submit button
 *   - #btnOTPServer              → "Send OTP" (in #TrMobile, hidden by default)
 *   - #btnlinkresend             → "Resend OTP" anchor (__doPostBack)
 *   - #HdnMobile                 → registered mobile number (hidden)
 *   - #HdnTicketID               → permit/ticket ID
 *   - #diverror.success          → shows "OTP sent to Mobile and Email"
 *   - #DivSubmit                 → payment submit div (display:none initially)
 *
 * FLOW:
 *   1. Confirm we are on the OTP page
 *   2. Log the mobile number and ticket ID for reference
 *   3. Wait for user to manually enter OTP (polls the input field)
 *   4. Auto-click Verify OTP
 *   5. Wait for payment page / next step
 *   6. Select Kiosk payment option (if present)
 *   7. Wait for manual/autofill payment completion
 */

const { log } = require('../utils/logger');
const { fetchOtpFromEmail } = require('../utils/gmailApiOtpFetcher');
const { recordPermitCompleted } = require('../utils/telemetry');

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Production config: Auto-fetching OTP without manual fallbacks

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Wait for the OTP using the Gmail API, then return the value.
 */
async function waitForOtpEntry(page, otpRequestContext = {}) {
  log('⏳ Fetching OTP from email automatically...');
  try {
      const otp = await fetchOtpFromEmail(otpRequestContext);
      await page.locator('#txtOTP').fill(otp);
      log(`✅ OTP automatically filled: ${otp}`);
      return otp;
  } catch (error) {
      log(`❌ Failed to fetch OTP automatically: ${error.message}`);
      throw new Error(`Automation stopped: Could not fetch OTP. ${error.message}`);
  }
}

/**
 * Try to resend OTP if user requests it or initial OTP is stale.
 */
async function resendOtp(page) {
  const resendLink = page.locator('#btnlinkresend');
  if (await resendLink.isVisible().catch(() => false)) {
    await resendLink.click();
    log('🔄 OTP resend triggered');
    await page.waitForTimeout(2000);
  } else {
    log('⚠️  Resend OTP link not visible');
  }
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

async function phase9OtpAndPaymentFlow(page) {
  log('Phase 9 (OTP + Payment) started');
  let otpRequestedAt = Date.now();

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: Confirm we are on the OTP page
  // ──────────────────────────────────────────────────────────────────────────
  const onOtpPage = await page.locator('#txtOTP').isVisible().catch(() => false);
  if (!onOtpPage) {
    // Maybe OTP row is hidden and Send OTP button needs clicking first
    const sendOtpBtn = page.locator('#btnOTPServer');
    const sendOtpVisible = await sendOtpBtn.isVisible().catch(() => false);

    if (sendOtpVisible) {
      log('📤 OTP not yet sent — clicking Send OTP');
      otpRequestedAt = Date.now();
      await sendOtpBtn.click();
      await page.waitForTimeout(3000);
    } else {
      // Wait up to 10s for OTP row to appear naturally
      await page.waitForSelector('#txtOTP', { timeout: 10000 }).catch(() => {
        throw new Error('OTP input not found on page');
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: Log reference details
  // ──────────────────────────────────────────────────────────────────────────
  const ticketId = await page.locator('#HdnTicketID').inputValue().catch(() => 'unknown');
  const mobile   = await page.locator('#HdnMobile').inputValue().catch(() => 'unknown');
  const email    = await page.locator('#HdnEmailID').inputValue().catch(() => 'unknown');

  log(`🎫 Ticket ID : ${ticketId}`);
  log(`📱 Mobile    : ${mobile}`);
  log(`📧 Email     : ${email}`);
  log(`👉 OTP has been sent to the above mobile/email — please enter it in the browser`);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3: Wait for user to type OTP
  // We do NOT auto-fetch OTP — that requires SMS gateway integration.
  // If you add an SMS API (e.g. Twilio, MSG91), replace waitForOtpEntry()
  // with a function that calls the API and fills #txtOTP automatically.
  // ──────────────────────────────────────────────────────────────────────────
  const otp = await waitForOtpEntry(page, {
    since: otpRequestedAt,
    ticketId,
    email,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 4: Submit OTP
  // ──────────────────────────────────────────────────────────────────────────

  // Register dialog handler BEFORE clicking (server may show alert)
  page.on('dialog', async (dialog) => {
    log(`🗨️  Dialog on OTP verify: "${dialog.message()}"`);
    await dialog.accept();
  });

  log('🔐 Submitting OTP...');
  await page.locator('#btnVerifyServer').click({ timeout: 3000 }).catch(e => {
    log(`⚠️  Could not click Verify OTP automatically (user may have clicked it): ${e.message}`);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 5: Wait for OTP verification to complete
  // After successful OTP, the page either:
  //   (a) navigates to a payment/confirmation page, OR
  //   (b) reveals #DivSubmit with a payment button on the same page
  // ──────────────────────────────────────────────────────────────────────────
  log('⏳ Waiting for OTP verification response...');

  try {
    // Wait for navigation OR for a payment/submit control to become visible
    await Promise.race([
      page.waitForNavigation({ timeout: 15000 }),
      page.waitForSelector('#DivSubmit', { state: 'visible', timeout: 15000 }),
      page.waitForSelector('input[type="submit"][value*="Pay"]', { timeout: 15000 }),
      page.waitForSelector('input[type="submit"][value*="Confirm"]', { timeout: 15000 }),
    ]);
    log('✅ OTP verified or payment step reached');
  } catch {
    // Check for error message on page
    const errText = await page.locator('.error, #diverror, .alert-danger')
      .first()
      .innerText()
      .catch(() => '');

    if (errText && errText.toLowerCase().includes('invalid')) {
      throw new Error(`OTP verification failed: ${errText}`);
    }

    log('⚠️  No navigation detected after OTP — checking current page state');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 6: Click Proceed to Payment (if present)
  // ──────────────────────────────────────────────────────────────────────────
  const divSubmit = page.locator('#DivSubmit');
  if (await divSubmit.isVisible().catch(() => false)) {
    log('📋 #DivSubmit is visible — looking for submit/pay button inside it');

    const submitBtn = divSubmit.locator('input[type="submit"], button');
    if (await submitBtn.first().isVisible().catch(() => false)) {
      log('💰 Clicking "Proceed To Payment" button...');

      const dialogHandler = async (dialog) => {
        log(`🗨️  Submit dialog: "${dialog.message()}"`);
        await dialog.accept();
      };
      page.once('dialog', dialogHandler);

      await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(() => log('⚠️ Navigation timeout, proceeding anyway')),
        submitBtn.first().click({ timeout: 3000 }).catch(e => log(`⚠️  Failed to click Proceed To Payment (user may have clicked): ${e.message}`))
      ]);
      await page.waitForTimeout(2000);
      log('✅ Navigated to payment page');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 7: Detect payment page type and handle accordingly
  // ──────────────────────────────────────────────────────────────────────────
  const currentUrl = page.url();
  log(`📍 Current URL: ${currentUrl}`);

  // Look for Kiosk payment option and select it. The payment page can update
  // asynchronously after this click, so wait briefly for it to settle.
  const kioskLabels = page.locator('label:has-text("Kiosk"), label:has-text("KIOSK")');
  if (await kioskLabels.count() > 0) {
    log('🔘 Kiosk label found, clicking...');
    await kioskLabels.first().click();
    await Promise.race([
      page.waitForLoadState('networkidle', { timeout: 5000 }),
      page.waitForNavigation({ timeout: 5000 }),
    ]).catch(() => {});
  } else {
    const kioskRadios = page.locator(
      'input[type="radio"][value*="Kiosk" i], input[type="radio"][id*="Kiosk" i], input[type="radio"][name*="Kiosk" i]'
    );
    if (await kioskRadios.count() > 0) {
      log('🔘 Kiosk radio found, clicking...');
      await kioskRadios.first().click();
      await Promise.race([
        page.waitForLoadState('networkidle', { timeout: 5000 }),
        page.waitForNavigation({ timeout: 5000 }),
      ]).catch(() => {});
    } else {
      log('⚠️  Kiosk payment option not found');
    }
  }

  log('👉 Kiosk payment page ready — use browser autofill or enter password manually.');

  // ── 7b: Online payment gateway ────────────────────────────────────────────
  // If redirected to payment gateway (HDFC, CCAvenue, PayU etc.)

  const isGatewayPage = currentUrl.includes('payment') ||
                        currentUrl.includes('gateway') ||
                        currentUrl.includes('pay') ||
                        currentUrl.includes('ccavenue') ||
                        currentUrl.includes('hdfc');

  if (isGatewayPage) {
    log('🌐 Payment gateway page detected');
    log('⚠️  Online payment gateway automation is not implemented.');
    log('👉 Please complete the payment manually in the browser.');

    // Wait for payment success page
    await page.waitForURL(
      url => url.includes('success') || url.includes('receipt') || url.includes('confirm'),
      { timeout: 10 * 60 * 1000 } // 10 min timeout for manual payment
    ).catch(() => log('⚠️  Timed out waiting for payment success page'));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 8: Wait for final confirmation / receipt page
  // ──────────────────────────────────────────────────────────────────────────
  log('⏳ Waiting for booking confirmation...');

  try {
    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('success') ||
               body.includes('confirmed') ||
               body.includes('receipt') ||
               body.includes('booking id') ||
               body.includes('permit id') ||
               body.includes('transaction');
      },
      { timeout: 30000 }
    );

    log('🎉 Booking confirmed!');

    // Grab confirmation details if present
    const confirmation = await page.evaluate(() => {
      const selectors = [
        '#lblTicketID', '#lbltransid', '#lbltotalamount',
        '#lblticketfee', '#lblbookingdate', '.success', '.BlockContentBold'
      ];
      const entries = selectors
        .map((s) => {
          const el = document.querySelector(s);
          return el ? [s, el.innerText.trim()] : null;
        })
        .filter(Boolean);

      return {
        text: entries.map(([selector, value]) => `${selector}: ${value}`).join('\n'),
        ticketId: document.querySelector('#lblTicketID')?.innerText.trim() || null,
        transactionId: document.querySelector('#lbltransid')?.innerText.trim() || null,
        totalAmount: document.querySelector('#lbltotalamount')?.innerText.trim() || null,
        ticketFee: document.querySelector('#lblticketfee')?.innerText.trim() || null,
        bookingDate: document.querySelector('#lblbookingdate')?.innerText.trim() || null,
        url: window.location.href,
      };
    });

    if (confirmation.text) {
      log('📄 Confirmation details:\n' + confirmation.text);
    }

    await recordPermitCompleted(confirmation);

  } catch {
    log('⚠️  Could not confirm booking completion — check browser manually');
  }

  log('✅ Phase 9 complete');
}

module.exports = { phase9OtpAndPaymentFlow };
