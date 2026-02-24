const browser = require('../browser');

async function getTasks(userId) {
  await browser.ensureRunning();
  const tasks = await browser.getTasks(userId);
  console.log(`Found ${tasks.length} tasks:`);
  tasks.forEach((task, i) => console.log(`  ${i + 1}. ${task}`));
  return tasks;
}

module.exports = getTasks;
