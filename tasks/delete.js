const browser = require('../browser');

async function deleteTask(userId, index) {
  await browser.ensureRunning();
  await browser.deleteTask(userId, index);
}

module.exports = deleteTask;
