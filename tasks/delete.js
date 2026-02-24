const browser = require('../browser');

async function deleteTask(index) {
  await browser.ensureRunning();
  await browser.ensureLoggedIn();
  await browser.deleteTask(index);
}

module.exports = deleteTask;
