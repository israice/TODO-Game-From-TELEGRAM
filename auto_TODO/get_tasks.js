const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
  headless: false,
  loginTimeout: 10000,
  loginUrl: 'https://todo.weforks.org/',
  successUrlPattern: /\/dashboard|\/todos|\/home/i,
  usernamePlaceholder: 'Введите имя пользователя',
  passwordPlaceholder: 'Введите пароль',
  loginButtonName: 'Начать приключение',
  delays: {
    afterLogin: 500,
    beforeTaskAction: 500,
  },
  outputPath: path.join(__dirname, '..', 'telegram', 'telegram_tasks.js')
};

(async () => {
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    console.log('Logging in...');
    await page.goto(config.loginUrl);

    await page.getByPlaceholder(config.usernamePlaceholder).fill(process.env.TODO_USERNAME);
    await page.getByPlaceholder(config.passwordPlaceholder).fill(process.env.TODO_PASSWORD);
    await page.getByRole('button', { name: config.loginButtonName }).click();

    await page.waitForURL(config.successUrlPattern, { timeout: config.loginTimeout })
      .catch(() => console.log('⚠ URL change not detected, continuing...'));

    console.log('✓ Login complete');

    // Wait after login
    await new Promise(r => setTimeout(r, config.delays.afterLogin));

    // Get tasks list
    await page.waitForSelector('#tasks-list', { timeout: 5000 });

    // Use specific selector for task text elements
    const tasks = await page.locator('#tasks-list > li > span.task-text').allTextContents();

    // Filter out empty tasks and clean up
    const cleanTasks = tasks
      .map(t => t.trim())
      .filter(t => t.length > 0);

    console.log(`Found ${cleanTasks.length} tasks:`);
    cleanTasks.forEach((task, i) => {
      console.log(`  ${i + 1}. ${task}`);
    });

    // Save tasks to file
    const outputContent = `module.exports = ${JSON.stringify(cleanTasks, null, 2)};\n`;
    fs.writeFileSync(config.outputPath, outputContent);
    console.log(`✓ Tasks saved to ${config.outputPath}`);

    // Wait before closing
    await new Promise(r => setTimeout(r, config.delays.beforeTaskAction));

    await page.close();
    await context.close();
    await browser.close();

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    await context.close();
    await browser.close();
    process.exit(1);
  }
})();
