const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const config = require('./rename_task_config');
const delays = config.delays;

// Read user input from telegram/telegram_text.js
const userTextPath = path.join(__dirname, '..', config.paths.userText);
let taskIndex = 0;  // 0-based index
let newTaskText = '';

try {
  const userData = require(userTextPath);
  if (userData.action === 'rename_task') {
    taskIndex = (userData.taskIndex || 1) - 1;  // Convert to 0-based
    newTaskText = userData.newText || '';
  }
} catch (err) {
  console.log('⚠ No user text found, using default');
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

    // Step 2: Rename task by index
    console.log(`Renaming task #${taskIndex + 1} to: "${newTaskText}"`);

    // Wait before task action
    await new Promise(r => setTimeout(r, delays.beforeTaskAction));

    // Wait for task list to be available
    await page.waitForSelector('#tasks-list', { timeout: 5000 });

    // Get all tasks using li elements (for counting and navigation)
    const tasks = page.locator('#tasks-list > li');
    const count = await tasks.count();

    if (taskIndex < 0 || taskIndex >= count) {
      console.log(`✗ Task index ${taskIndex + 1} out of range (total: ${count})`);
    } else {
      // Get the task by index
      const taskElement = tasks.nth(taskIndex);
      const taskTextElement = taskElement.locator('span.task-text');

      // Click on the task text to edit
      await taskTextElement.click();

      // Wait for input to be ready
      await new Promise(r => setTimeout(r, delays.afterTaskAction));

      // Select all text (Ctrl+A)
      await page.keyboard.press('Control+A');

      // Type new text
      await page.keyboard.type(newTaskText);

      // Press Enter to save
      await page.keyboard.press('Enter');

      // Wait after task action
      await new Promise(r => setTimeout(r, delays.afterTaskAction));

      console.log(`✓ Task #${taskIndex + 1} renamed successfully`);
    }

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
