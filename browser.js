const { chromium } = require('playwright');
const config = require('./config');

class BrowserService {
  constructor() {
    this.browser = null;
    // Map<userId, { context, page, isLoggedIn, credentials }>
    this.sessions = new Map();
  }

  async ensureRunning() {
    if (!this.browser) {
      console.log('Launching browser...');
      this.browser = await chromium.launch({ headless: config.browser.headless });
    }
    return this;
  }

  async getSession(userId) {
    if (!this.sessions.has(userId)) {
      const context = await this.browser.newContext();
      const page = await context.newPage();
      this.sessions.set(userId, {
        context,
        page,
        isLoggedIn: false,
        credentials: null
      });
      console.log(`Created new session for user ${userId}`);
    }
    return this.sessions.get(userId);
  }

  async tryLogin(userId, username, password) {
    console.log(`Trying to login user ${userId} with provided credentials...`);
    const session = await this.getSession(userId);
    await session.page.goto(config.browser.loginUrl);

    await session.page.getByPlaceholder(config.login.usernamePlaceholder).fill(username);
    await session.page.getByPlaceholder(config.login.passwordPlaceholder).fill(password);
    await session.page.getByRole('button', { name: config.login.buttonName }).click();

    // Wait a bit for any error message or success
    await this.sleep(1000);

    try {
      // Check for error message first (common error selectors)
      const errorMessage = await session.page.locator('.error, .error-message, [class*="error"], .alert-danger').first().textContent().catch(() => null);
      if (errorMessage && errorMessage.trim().length > 0) {
        console.log(`✗ Login failed for user ${userId}:`, errorMessage);
        return false;
      }
    } catch (e) {
      // No error message found, continue checking for success
    }

    try {
      await Promise.race([
        session.page.waitForURL(config.browser.successUrlPattern, { timeout: config.browser.loginTimeout }),
        session.page.waitForSelector(config.tasks.listSelector, { timeout: config.browser.loginTimeout })
      ]);
      console.log(`✓ Login successful for user ${userId}`);
      await this.sleep(config.delays.afterLogin);
      session.isLoggedIn = true;
      session.credentials = { username, password };
      return true;
    } catch (error) {
      console.log(`✗ Login failed for user ${userId}`);
      return false;
    }
  }

  async register(userId, username, password) {
    console.log(`Registering new user ${userId}...`);
    const session = await this.getSession(userId);
    await session.page.goto(config.browser.registerUrl);

    await session.page.getByPlaceholder(config.register.usernamePlaceholder).fill(username);
    await session.page.getByPlaceholder(config.register.passwordPlaceholder).fill(password);
    await session.page.getByPlaceholder(config.register.confirmPasswordPlaceholder).fill(password);
    await session.page.getByRole('button', { name: config.register.buttonName }).click();

    try {
      await Promise.race([
        session.page.waitForURL(config.browser.successUrlPattern, { timeout: config.browser.loginTimeout }),
        session.page.waitForSelector(config.tasks.listSelector, { timeout: config.browser.loginTimeout })
      ]);
      console.log(`✓ Registration complete for user ${userId}`);
      await this.sleep(config.delays.afterLogin);
      session.isLoggedIn = true;
      session.credentials = { username, password };
      return true;
    } catch (error) {
      console.log(`✗ Registration failed for user ${userId}`);
      return false;
    }
  }

  async getPage(userId) {
    const session = await this.getSession(userId);
    return session.page;
  }

  async getTasks(userId) {
    const page = await this.getPage(userId);
    await page.waitForSelector(config.tasks.listSelector, { timeout: 5000 });
    const tasks = await page.locator(config.tasks.itemSelector).allTextContents();
    return tasks.map(t => t.trim()).filter(t => t.length > 0);
  }

  async addTask(userId, text) {
    const page = await this.getPage(userId);
    console.log(`User ${userId} adding task: "${text}"`);
    await this.sleep(config.delays.beforeTaskAction);
    await page.waitForSelector(config.tasks.inputSelector, { timeout: 5000 });
    await page.locator(config.tasks.inputSelector).fill(text);
    await page.locator(config.tasks.addButtonSelector).click();
    await this.sleep(config.delays.afterTaskAction);
    console.log('✓ Task added successfully');
  }

  async deleteTask(userId, index) {
    const page = await this.getPage(userId);
    console.log(`User ${userId} deleting task #${index + 1}`);
    await this.sleep(config.delays.beforeTaskAction);
    await page.waitForSelector(config.tasks.listSelector, { timeout: 5000 });

    const tasks = page.locator('#tasks-list > li');
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

  async completeTask(userId, index) {
    const page = await this.getPage(userId);
    console.log(`User ${userId} completing task #${index + 1}`);
    await this.sleep(config.delays.beforeTaskAction);
    await page.waitForSelector(config.tasks.listSelector, { timeout: 5000 });

    const tasks = page.locator('#tasks-list > li');
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

  async renameTask(userId, index, newText) {
    const page = await this.getPage(userId);
    console.log(`User ${userId} renaming task #${index + 1} to: "${newText}"`);
    await this.sleep(config.delays.beforeTaskAction);
    await page.waitForSelector(config.tasks.listSelector, { timeout: 5000 });

    const tasks = page.locator('#tasks-list > li');
    const count = await tasks.count();

    if (index < 0 || index >= count) {
      console.log(`✗ Task index ${index + 1} out of range (total: ${count})`);
      return;
    }

    const taskElement = tasks.nth(index);
    const taskTextElement = taskElement.locator('span.task-text');

    await taskTextElement.click();
    await this.sleep(config.delays.afterTaskAction);
    await page.keyboard.press('Control+A');
    await page.keyboard.type(newText);
    await page.keyboard.press('Enter');
    await this.sleep(config.delays.afterTaskAction);
    console.log(`✓ Task #${index + 1} renamed successfully`);
  }

  async closeUserSession(userId) {
    const session = this.sessions.get(userId);
    if (session) {
      if (session.page) {
        await session.page.close();
        console.log(`✓ Tab closed for user ${userId}`);
      }
      if (session.context) {
        await session.context.close();
      }
      this.sessions.delete(userId);
      console.log(`✓ Session closed for user ${userId}`);
    }
  }

  async close() {
    // Close all user sessions
    const userIds = Array.from(this.sessions.keys());
    for (const userId of userIds) {
      await this.closeUserSession(userId);
    }
    if (this.browser) {
      await this.browser.close();
      console.log('✓ Browser closed');
    }
    this.browser = null;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const instance = new BrowserService();

module.exports = instance;
