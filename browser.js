const { chromium } = require('playwright');
const config = require('./config');

class BrowserService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async launch() {
    this.browser = await chromium.launch({ headless: config.browser.headless });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async login() {
    console.log('Logging in...');
    await this.page.goto(config.browser.loginUrl);

    await this.page.getByPlaceholder(config.login.usernamePlaceholder).fill(config.credentials.username);
    await this.page.getByPlaceholder(config.login.passwordPlaceholder).fill(config.credentials.password);
    await this.page.getByRole('button', { name: config.login.buttonName }).click();

    await this.page.waitForURL(config.browser.successUrlPattern, { timeout: config.browser.loginTimeout })
      .catch(() => console.log('⚠ URL change not detected, continuing...'));

    console.log('✓ Login complete');
    await this.sleep(config.delays.afterLogin);
  }

  async getTasks() {
    await this.page.waitForSelector(config.tasks.listSelector, { timeout: 5000 });
    const tasks = await this.page.locator(config.tasks.itemSelector).allTextContents();
    return tasks.map(t => t.trim()).filter(t => t.length > 0);
  }

  async addTask(text) {
    console.log(`Adding task: "${text}"`);
    await this.sleep(config.delays.beforeTaskAction);
    await this.page.waitForSelector(config.tasks.inputSelector, { timeout: 5000 });
    await this.page.locator(config.tasks.inputSelector).fill(text);
    await this.page.locator(config.tasks.addButtonSelector).click();
    await this.sleep(config.delays.afterTaskAction);
    console.log('✓ Task added successfully');
  }

  async deleteTask(index) {
    console.log(`Deleting task #${index + 1}`);
    await this.sleep(config.delays.beforeTaskAction);
    await this.page.waitForSelector(config.tasks.listSelector, { timeout: 5000 });

    const tasks = this.page.locator('#tasks-list > li');
    const count = await tasks.count();

    if (index < 0 || index >= count) {
      console.log(`✗ Task index ${index + 1} out of range (total: ${count})`);
      return;
    }

    const taskElement = tasks.nth(index);
    const deleteButton = taskElement.locator('button');
    await deleteButton.click();
    await this.sleep(config.delays.afterTaskAction);
    console.log(`✓ Task #${index + 1} deleted successfully`);
  }

  async completeTask(index) {
    console.log(`Completing task #${index + 1}`);
    await this.sleep(config.delays.beforeTaskAction);
    await this.page.waitForSelector(config.tasks.listSelector, { timeout: 5000 });

    const tasks = this.page.locator('#tasks-list > li');
    const count = await tasks.count();

    if (index < 0 || index >= count) {
      console.log(`✗ Task index ${index + 1} out of range (total: ${count})`);
      return;
    }

    const taskElement = tasks.nth(index);
    const checkbox = taskElement.locator('label > input[type="checkbox"]');
    await checkbox.click();
    await this.sleep(config.delays.afterTaskAction);
    console.log(`✓ Task #${index + 1} completed successfully`);
  }

  async renameTask(index, newText) {
    console.log(`Renaming task #${index + 1} to: "${newText}"`);
    await this.sleep(config.delays.beforeTaskAction);
    await this.page.waitForSelector(config.tasks.listSelector, { timeout: 5000 });

    const tasks = this.page.locator('#tasks-list > li');
    const count = await tasks.count();

    if (index < 0 || index >= count) {
      console.log(`✗ Task index ${index + 1} out of range (total: ${count})`);
      return;
    }

    const taskElement = tasks.nth(index);
    const taskTextElement = taskElement.locator('span.task-text');

    await taskTextElement.click();
    await this.sleep(config.delays.afterTaskAction);
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.type(newText);
    await this.page.keyboard.press('Enter');
    await this.sleep(config.delays.afterTaskAction);
    console.log(`✓ Task #${index + 1} renamed successfully`);
  }

  async close() {
    await this.sleep(config.delays.beforeClose);
    await this.page.close();
    console.log('✓ Tab closed');
    await this.context.close();
    await this.browser.close();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BrowserService;
