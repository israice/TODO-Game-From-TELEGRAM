const browser = require('../browser');

async function register(userId, username, password) {
  await browser.ensureRunning();
  const result = await browser.register(userId, username, password);
  return result;
}

module.exports = register;
