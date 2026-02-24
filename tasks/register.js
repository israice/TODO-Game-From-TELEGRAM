const browser = require('../browser');

async function register(userId, username, password) {
  await browser.ensureRunning();
  const success = await browser.register(userId, username, password);
  return success;
}

module.exports = register;
