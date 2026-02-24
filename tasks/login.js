const browser = require('../browser');

async function login(userId, username, password) {
  await browser.ensureRunning();
  const success = await browser.tryLogin(userId, username, password);
  return success;
}

module.exports = login;
