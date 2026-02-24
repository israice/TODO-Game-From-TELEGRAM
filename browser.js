const { chromium } = require('playwright');
const config = require('./config');

class BrowserService {
  constructor() {
    this.browser = null;
    // Map<userId, { context, page, isLoggedIn, credentials }>
    this.sessions = new Map();
    // Map<username, userId> - track which user is logged in with which account
    this.usernameToUserId = new Map();
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
    
    // Check if this username is already logged in by another user
    const existingUserId = this.usernameToUserId.get(username);
    if (existingUserId && existingUserId !== userId) {
      console.log(`✗ Login failed: account "${username}" is already in use by user ${existingUserId}`);
      return { success: false, error: 'Этот аккаунт уже используется другим пользователем', alreadyInUse: true };
    }
    
    const session = await this.getSession(userId);
    await session.page.goto(config.browser.loginUrl);

    // Click on the login tab to ensure it's active
    const loginTab = session.page.locator(config.selectors.tabs).nth(0);
    await loginTab.click();

    // Wait for login form fields to be visible
    await session.page.waitForSelector(`input[placeholder="${config.login.usernamePlaceholder}"]`, { timeout: config.timeouts.loginForm });

    await session.page.getByPlaceholder(config.login.usernamePlaceholder).fill(username);
    await session.page.getByPlaceholder(config.login.passwordPlaceholder).fill(password);
    await session.page.getByRole('button', { name: config.login.buttonName }).click();

    // Wait a bit for any error message or success
    await this.sleep(config.delays.afterLogin);

    // Check for error message - without waiting
    const errorMessage = await session.page.$eval(config.selectors.errorMessages, el => el.textContent?.trim() || '').catch(() => '');
    if (errorMessage && errorMessage.length > 0) {
      console.log(`✗ Login failed for user ${userId}:`, errorMessage);
      return { success: false, error: errorMessage };
    }

    try {
      await Promise.race([
        session.page.waitForURL(config.browser.successUrlPattern, { timeout: config.timeouts.pageLoad }),
        session.page.waitForSelector(config.tasks.listSelector, { timeout: config.timeouts.pageLoad })
      ]);
      console.log(`✓ Login successful for user ${userId}`);
      session.isLoggedIn = true;
      session.credentials = { username, password };
      this.usernameToUserId.set(username, userId);
      return { success: true };
    } catch (error) {
      console.log(`✗ Login failed for user ${userId}`);
      return { success: false, error: 'Login failed' };
    }
  }

  async register(userId, username, password) {
    console.log(`Registering new user ${userId}...`);
    
    // Check if this username is already registered by another user
    const existingUserId = this.usernameToUserId.get(username);
    if (existingUserId && existingUserId !== userId) {
      console.log(`✗ Registration failed: account "${username}" is already in use by user ${existingUserId}`);
      return { success: false, error: 'Этот аккаунт уже используется другим пользователем', alreadyInUse: true };
    }
    
    const session = await this.getSession(userId);
    await session.page.goto(config.browser.loginUrl);

    // Wait for page to load
    await this.sleep(config.delays.beforeRegisterTab);

    // Click on the registration tab to switch from login to registration
    const registerTab = session.page.locator(config.selectors.tabs).nth(1);
    await registerTab.click();

    // Wait for registration form to be ready
    await session.page.waitForSelector(config.register.usernameField, { timeout: config.timeouts.registrationForm });

    // Fill registration form
    await session.page.fill(config.register.usernameField, username);
    await session.page.fill(config.register.passwordField, password);
    await session.page.press(config.register.passwordField, 'Enter');

    // Wait for response
    await this.sleep(500);

    // Check for error message (user already exists) - without waiting
    const errorMessage = await session.page.$eval(config.selectors.errorMessages, el => el.textContent?.trim() || '').catch(() => '');
    if (errorMessage && errorMessage.length > 0) {
      console.log(`✗ Registration failed for user ${userId}:`, errorMessage);
      return { success: false, error: errorMessage, alreadyExists: errorMessage.toLowerCase().includes('уже') || errorMessage.toLowerCase().includes('exists') };
    }

    // No error = registration successful
    console.log(`✓ Registration successful for user ${userId}`);
    session.isLoggedIn = true;
    session.credentials = { username, password };
    this.usernameToUserId.set(username, userId);
    return { success: true };
  }

  async getPage(userId) {
    const session = await this.getSession(userId);
    return session.page;
  }

  async getTasks(userId) {
    const page = await this.getPage(userId);
    await page.waitForSelector(config.tasks.listSelector, { timeout: config.timeouts.taskList });
    const tasks = await page.locator(config.tasks.itemSelector).allTextContents();
    return tasks.map(t => t.trim()).filter(t => t.length > 0);
  }

  async addTask(userId, text) {
    const page = await this.getPage(userId);
    console.log(`User ${userId} adding task: "${text}"`);
    await this.sleep(config.delays.beforeTaskAction);
    await page.waitForSelector(config.tasks.inputSelector, { timeout: config.timeouts.taskList });
    await page.locator(config.tasks.inputSelector).fill(text);
    await page.locator(config.tasks.addButtonSelector).click();
    await this.sleep(config.delays.afterTaskAction);
    console.log('✓ Task added successfully');
  }

  async deleteTask(userId, index) {
    const page = await this.getPage(userId);
    console.log(`User ${userId} deleting task #${index + 1}`);
    await this.sleep(config.delays.beforeTaskAction);
    await page.waitForSelector(config.tasks.listSelector, { timeout: config.timeouts.taskList });

    const tasks = page.locator(config.tasks.itemWrapperSelector);
    const count = await tasks.count();

    if (index < 0 || index >= count) {
      console.log(config.telegram.messages.taskIndexOutOfRange.replace('%d', index + 1).replace('%d', count));
      return;
    }

    const taskElement = tasks.nth(index);
    const deleteButton = taskElement.locator(config.tasks.deleteButtonSelector);
    await deleteButton.click();
    await this.sleep(config.delays.afterTaskAction);
    console.log(`✓ Task #${index + 1} deleted successfully`);
  }

  async completeTask(userId, index) {
    const page = await this.getPage(userId);
    console.log(`User ${userId} completing task #${index + 1}`);
    await this.sleep(config.delays.beforeTaskAction);
    await page.waitForSelector(config.tasks.listSelector, { timeout: config.timeouts.taskList });

    const tasks = page.locator(config.tasks.itemWrapperSelector);
    const count = await tasks.count();

    if (index < 0 || index >= count) {
      console.log(config.telegram.messages.taskIndexOutOfRange.replace('%d', index + 1).replace('%d', count));
      return;
    }

    const taskElement = tasks.nth(index);
    const checkbox = taskElement.locator(config.tasks.checkboxSelector);
    await checkbox.click();
    await this.sleep(config.delays.afterTaskAction);
    console.log(`✓ Task #${index + 1} completed successfully`);
  }

  async renameTask(userId, index, newText) {
    const page = await this.getPage(userId);
    console.log(`User ${userId} renaming task #${index + 1} to: "${newText}"`);
    await this.sleep(config.delays.beforeTaskAction);
    await page.waitForSelector(config.tasks.listSelector, { timeout: config.timeouts.taskList });

    const tasks = page.locator(config.tasks.itemWrapperSelector);
    const count = await tasks.count();

    if (index < 0 || index >= count) {
      console.log(config.telegram.messages.taskIndexOutOfRange.replace('%d', index + 1).replace('%d', count));
      return;
    }

    const taskElement = tasks.nth(index);
    const taskTextElement = taskElement.locator(config.tasks.taskTextSelector);

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
      // Remove username mapping if logged in
      if (session.credentials?.username) {
        this.usernameToUserId.delete(session.credentials.username);
      }
      
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
      const session = this.sessions.get(userId);
      if (session) {
        // Remove username mapping if logged in
        if (session.credentials?.username) {
          this.usernameToUserId.delete(session.credentials.username);
        }
        
        try {
          if (session.page) {
            await session.page.close();
            console.log(`✓ Tab closed for user ${userId}`);
          }
          if (session.context) {
            await session.context.close();
          }
        } catch (error) {
          // Ignore errors if already closed
        }
        this.sessions.delete(userId);
        console.log(`✓ Session closed for user ${userId}`);
      }
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
