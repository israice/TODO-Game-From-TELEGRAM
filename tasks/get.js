const browser = require('../browser');

async function getTasks() {
  await browser.ensureRunning();
  await browser.ensureLoggedIn();
  const tasks = await browser.getTasks();
  console.log(`Found ${tasks.length} tasks:`);
  tasks.forEach((task, i) => console.log(`  ${i + 1}. ${task}`));
  return tasks;
}

module.exports = getTasks;
