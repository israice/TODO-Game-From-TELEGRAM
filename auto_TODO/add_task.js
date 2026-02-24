const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const config = require('./add_task_config');
const delays = config.delays;

// Read user input from telegram/telegram_text.js
const userTextPath = path.join(__dirname, '..', config.paths.userText);
let userText = '';
try {
  const userData = require(userTextPath);
  if (userData.action === 'add_task') {
    userText = userData.text;
  }
} catch (err) {
  console.log('⚠ No user text found, using default');
  userText = config.taskText;
}

(async () => {
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Login
    console.log('Logging in...');
    await page.goto(config.loginUrl);

    await page.getByPlaceholder(config.usernamePlaceholder).fill(process.env.TODO_USERNAME);
    await page.getByPlaceholder(config.passwordPlaceholder).fill(process.env.TODO_PASSWORD);
    await page.getByRole('button', { name: config.loginButtonName }).click();

    await page.waitForURL(config.successUrlPattern, { timeout: config.loginTimeout })
      .catch(() => console.log(config.messages.urlWaitFailed));

    console.log(config.messages.loginComplete);

    // Wait after login
    await new Promise(r => setTimeout(r, delays.afterLogin));

    // Step 2: Add TODO task
    const taskText = userText;
    console.log(`Adding task: "${taskText}"`);

    // Wait before task action
    await new Promise(r => setTimeout(r, delays.beforeTaskAction));

    // Wait for task input to be available
    await page.waitForSelector('#task-input', { timeout: 5000 });
    
    // Fill the task input
    await page.locator('#task-input').fill(taskText);
    
    // Click the add button
    await page.locator('#add-btn > span.btn-icon').click();

    // Wait after task action
    await new Promise(r => setTimeout(r, delays.afterTaskAction));
    
    console.log('✓ Task added successfully');

    // Wait before closing
    await new Promise(r => setTimeout(r, delays.beforeClose));

    // Close the tab
    await page.close();
    console.log('✓ Tab closed');

    // Poll until page is closed
    while (true) {
      if (page.isClosed()) break;
      await new Promise(r => setTimeout(r, config.pollInterval));
    }
    console.log(config.messages.browserClosed);
  } catch (error) {
    console.error(config.messages.error, error.message);
  } finally {
    await context.close();
    await browser.close();
    process.exit(0);
  }
})();
