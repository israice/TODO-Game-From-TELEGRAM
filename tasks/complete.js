const BrowserService = require('../browser');

async function completeTask(index) {
  const browser = new BrowserService();
  try {
    await browser.launch();
    await browser.login();
    await browser.completeTask(index);
  } finally {
    await browser.close();
  }
}

module.exports = completeTask;
