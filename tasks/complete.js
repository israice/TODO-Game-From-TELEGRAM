const browser = require('../browser');

async function completeTask(userId, index) {
  await browser.ensureRunning();
  await browser.completeTask(userId, index);
}

module.exports = completeTask;
