const BrowserService = require('../browser');

async function deleteTask(index) {
  const browser = new BrowserService();
  try {
    await browser.launch();
    await browser.login();
    await browser.deleteTask(index);
  } finally {
    await browser.close();
  }
}

module.exports = deleteTask;
