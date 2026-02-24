const BrowserService = require('../browser');

async function renameTask(index, newText) {
  const browser = new BrowserService();
  try {
    await browser.launch();
    await browser.login();
    await browser.renameTask(index, newText);
  } finally {
    await browser.close();
  }
}

module.exports = renameTask;
