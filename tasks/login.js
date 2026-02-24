const browser = require('../browser');

async function login(userId, username, password) {
  await browser.ensureRunning();
  const result = await browser.tryLogin(userId, username, password);
  return result;
}

module.exports = login;
