const browser = require('../browser');

async function completeTask(index) {
  await browser.ensureRunning();
  await browser.ensureLoggedIn();
  await browser.completeTask(index);
}

module.exports = completeTask;
