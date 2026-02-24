const BrowserService = require('../browser');

async function addTask(text) {
  const browser = new BrowserService();
  try {
    await browser.launch();
    await browser.login();
    await browser.addTask(text);
  } finally {
    await browser.close();
  }
}

module.exports = addTask;
