const browser = require('../browser');

async function renameTask(index, newText) {
  await browser.ensureRunning();
  await browser.ensureLoggedIn();
  await browser.renameTask(index, newText);
}

module.exports = renameTask;
