const browser = require('../browser');

async function renameTask(userId, index, newText) {
  await browser.ensureRunning();
  await browser.renameTask(userId, index, newText);
}

module.exports = renameTask;
