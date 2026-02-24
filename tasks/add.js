const browser = require('../browser');

async function addTask(userId, text) {
  await browser.ensureRunning();
  await browser.addTask(userId, text);
}

module.exports = addTask;
