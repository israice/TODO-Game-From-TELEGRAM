const BrowserService = require('../browser');

async function getTasks() {
  const browser = new BrowserService();
  try {
    await browser.launch();
    await browser.login();
    const tasks = await browser.getTasks();
    console.log(`Found ${tasks.length} tasks:`);
    tasks.forEach((task, i) => console.log(`  ${i + 1}. ${task}`));
    return tasks;
  } finally {
    await browser.close();
  }
}

module.exports = getTasks;
