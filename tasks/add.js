const browser = require('../browser');

async function addTask(text) {
  await browser.ensureRunning();
  await browser.ensureLoggedIn();
  await browser.addTask(text);
}

module.exports = addTask;
