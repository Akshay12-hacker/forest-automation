async function isLoggedIn(page) {
  // Dashboard visible = logged in
  return page.url().includes('DashBoardHome.aspx');
}

module.exports = { isLoggedIn };
