async function dashboardFlow(page) {
  if (!page.url().includes('DashBoardHome.aspx')) return;

  const bookPermit = page.locator('a:has-text("Book Permit")');
  await bookPermit.waitFor();
  await bookPermit.click();

  await page.waitForLoadState('domcontentloaded');
}

module.exports={dashboardFlow}
