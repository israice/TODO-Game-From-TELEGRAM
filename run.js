const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const browser = require('./browser');
const getTasks = require('./tasks/get');
const addTask = require('./tasks/add');
const deleteTask = require('./tasks/delete');
const renameTask = require('./tasks/rename');
const completeTask = require('./tasks/complete');
const login = require('./tasks/login');
const register = require('./tasks/register');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// In-memory session storage
const sessions = new Map();

bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (userId) {
    ctx.session = sessions.get(userId) || { action: null, step: null, authenticated: false };
    return next().then(() => {
      if (ctx.session) sessions.set(userId, ctx.session);
    });
  }
  return next();
});

// Auth keyboard (Login | Registration)
const authKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback(config.telegram.buttons.login, config.telegram.actions.LOGIN),
    Markup.button.callback(config.telegram.buttons.register, config.telegram.actions.REGISTER)
  ]
]);

// Main keyboard with task actions
const mainKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback(config.telegram.buttons.add_task, config.telegram.actions.ADD_TASK),
    Markup.button.callback(config.telegram.buttons.delete_task, config.telegram.actions.DELETE_TASK)
  ],
  [
    Markup.button.callback(config.telegram.buttons.rename_task, config.telegram.actions.RENAME_TASK),
    Markup.button.callback(config.telegram.buttons.complete_task, config.telegram.actions.COMPLETE_TASK)
  ],
  [
    Markup.button.callback(config.telegram.buttons.show_tasks, config.telegram.actions.SHOW_TASKS)
  ]
]);

// Back to auth keyboard
const backToAuthKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback(config.telegram.messages.auth.back_to_auth, 'back_to_auth')]
]);

bot.start(async (ctx) => {
  // Close this user's browser session
  const userId = ctx.from?.id;
  if (userId) {
    await browser.closeUserSession(userId);
  }
  ctx.session = { action: null, step: null, authenticated: false };
  ctx.reply(config.telegram.messages.auth.start, authKeyboard);
});

// Command to close browser for this user
bot.command('stop', async (ctx) => {
  const userId = ctx.from?.id;
  if (userId) {
    await browser.closeUserSession(userId);
  }
  ctx.reply('✅ Сервер остановлен пользователем');
});

// === AUTH FLOW ===

// Login button handler
bot.action(config.telegram.actions.LOGIN, (ctx) => {
  ctx.reply(config.telegram.messages.auth.login_prompt);
  ctx.session = { action: config.telegram.actions.LOGIN, step: 'enter_username', authenticated: false };
});

// Registration button handler
bot.action(config.telegram.actions.REGISTER, (ctx) => {
  ctx.reply(config.telegram.messages.auth.register_username_prompt);
  ctx.session = { action: config.telegram.actions.REGISTER, step: 'enter_username', authenticated: false };
});

// Back to auth handler
bot.action('back_to_auth', (ctx) => {
  ctx.session = { action: null, step: null, authenticated: false };
  ctx.editMessageText(config.telegram.messages.auth.start, authKeyboard);
});

// === TASK FLOW (only for authenticated users) ===

// Check if user is authenticated
function checkAuth(ctx) {
  if (!ctx.session?.authenticated) {
    ctx.reply(config.telegram.messages.no_action, authKeyboard);
    return false;
  }
  return true;
}

bot.action(config.telegram.actions.ADD_TASK, (ctx) => {
  if (!checkAuth(ctx)) return;
  ctx.reply(config.telegram.messages.prompts.add_task);
  ctx.session = { ...ctx.session, action: config.telegram.actions.ADD_TASK };
});

// Load and show tasks for DELETE, RENAME, COMPLETE
async function loadAndShowTasks(ctx, action) {
  if (!checkAuth(ctx)) return;
  const userId = ctx.from?.id;
  ctx.reply(config.telegram.messages.loading_tasks);
  try {
    const tasks = await getTasks(userId);
    if (tasks.length === 0) {
      ctx.reply(config.telegram.messages.no_tasks, mainKeyboard);
      ctx.session = { ...ctx.session, action: null };
      return;
    }
    const taskList = tasks.map((task, i) => `${i + 1}. ${task}`).join('\n');
    await ctx.reply(config.telegram.messages.task_list.replace('%s', taskList));
    
    // If action is null (SHOW_TASKS), just show the list and return to main menu
    if (action === null) {
      ctx.session = { ...ctx.session, action: null };
      return;
    }
    
    ctx.session = { ...ctx.session, action, step: 'select_task', tasks };
  } catch (error) {
    // Check if browser was closed
    if (error.message.includes('closed') || error.message.includes('Target page') || error.message.includes('context')) {
      ctx.reply(config.telegram.messages.browser_closed, authKeyboard);
      ctx.session = { action: null, step: null, authenticated: false };
    } else {
      ctx.reply(config.telegram.messages.error.replace('%s', error.message), mainKeyboard);
      ctx.session = { ...ctx.session, action: null };
    }
  }
}

bot.action(config.telegram.actions.DELETE_TASK, (ctx) => loadAndShowTasks(ctx, config.telegram.actions.DELETE_TASK));
bot.action(config.telegram.actions.RENAME_TASK, (ctx) => loadAndShowTasks(ctx, config.telegram.actions.RENAME_TASK));
bot.action(config.telegram.actions.COMPLETE_TASK, (ctx) => loadAndShowTasks(ctx, config.telegram.actions.COMPLETE_TASK));
bot.action(config.telegram.actions.SHOW_TASKS, (ctx) => loadAndShowTasks(ctx, null));

// Handle text messages
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  const session = ctx.session || {};
  const { action, step, tasks, selectedTask, tempCredentials } = session;

  // === AUTH FLOW ===

  // Step 1: Enter username for LOGIN or REGISTER
  if (step === 'enter_username') {
    const username = ctx.message.text.trim();
    if (action === config.telegram.actions.REGISTER) {
      // For registration, ask for password next
      ctx.session = { ...session, step: 'enter_password', tempCredentials: { username } };
      ctx.reply(config.telegram.messages.auth.register_password_prompt);
      return;
    } else if (action === config.telegram.actions.LOGIN) {
      // For login, ask for password next
      ctx.session = { ...session, step: 'enter_password', tempCredentials: { username } };
      ctx.reply(config.telegram.messages.auth.password_prompt);
      return;
    }
  }

  // Step 2: Enter password for LOGIN or REGISTER
  if (step === 'enter_password') {
    const password = ctx.message.text.trim();
    const username = tempCredentials?.username;

    if (!username) {
      ctx.reply(config.telegram.messages.session_error, authKeyboard);
      return;
    }

    ctx.reply(config.telegram.messages.executing);

    if (action === config.telegram.actions.LOGIN) {
      // Try to login
      try {
        const result = await login(userId, username, password);
        if (result.success) {
          ctx.reply(config.telegram.messages.auth.login_success, mainKeyboard);
          ctx.session = { action: null, step: null, authenticated: true };
        } else {
          // Check if account is already in use
          if (result.alreadyInUse) {
            ctx.reply('❌ Этот аккаунт уже используется другим пользователем', authKeyboard);
          } else {
            ctx.reply(config.telegram.messages.auth.login_failed, authKeyboard);
          }
          ctx.session = { action: null, step: null, authenticated: false };
        }
      } catch (error) {
        // Check if browser was closed
        if (error.message.includes('closed') || error.message.includes('Target page') || error.message.includes('context')) {
          ctx.reply(config.telegram.messages.browser_closed, authKeyboard);
          ctx.session = { action: null, step: null, authenticated: false };
        } else {
          ctx.reply(config.telegram.messages.error.replace('%s', error.message), authKeyboard);
          ctx.session = { action: null, step: null, authenticated: false };
        }
      }
      return;
    }

    if (action === config.telegram.actions.REGISTER) {
      // Try to register
      try {
        const result = await register(userId, username, password);
        if (result.success) {
          ctx.reply(config.telegram.messages.auth.register_success, mainKeyboard);
          ctx.session = { action: null, step: null, authenticated: true };
        } else {
          // Registration failed
          if (result.alreadyInUse) {
            ctx.reply('❌ Этот аккаунт уже используется другим пользователем', authKeyboard);
          } else if (result.alreadyExists) {
            ctx.reply('❌ Пользователь с таким именем уже существует. Попробуйте другое имя или войдите.', authKeyboard);
          } else {
            ctx.reply(config.telegram.messages.auth.register_failed.replace('%s', result.error || 'Неизвестная ошибка'), authKeyboard);
          }
          ctx.session = { action: null, step: null, authenticated: false };
        }
      } catch (error) {
        // Check if browser was closed
        if (error.message.includes('closed') || error.message.includes('Target page') || error.message.includes('context')) {
          ctx.reply(config.telegram.messages.browser_closed, authKeyboard);
          ctx.session = { action: null, step: null, authenticated: false };
        } else {
          ctx.reply(config.telegram.messages.auth.register_failed.replace('%s', error.message), authKeyboard);
          ctx.session = { action: null, step: null, authenticated: false };
        }
      }
      return;
    }
  }

  // === TASK FLOW (only for authenticated users) ===

  if (!session.authenticated) {
    ctx.reply(config.telegram.messages.no_action, authKeyboard);
    return;
  }

  if (!action) {
    ctx.reply(config.telegram.messages.no_action, mainKeyboard);
    return;
  }

  // Step 1: Select task by number
  if (step === 'select_task') {
    const taskNumber = parseInt(ctx.message.text.trim()) - 1;
    if (isNaN(taskNumber) || taskNumber < 0 || taskNumber >= tasks.length) {
      ctx.reply(config.telegram.messages.invalid_number);
      return;
    }

    const selectedTask = tasks[taskNumber];

    if (action === config.telegram.actions.RENAME_TASK) {
      ctx.session = { ...session, step: 'enter_new_name', tasks, selectedTask };
      ctx.reply(config.telegram.messages.auth.rename_prompt);
      return;
    }

    // DELETE or COMPLETE - execute immediately
    ctx.reply(config.telegram.messages.executing);
    try {
      if (action === config.telegram.actions.DELETE_TASK) {
        await deleteTask(userId, taskNumber);
      } else if (action === config.telegram.actions.COMPLETE_TASK) {
        await completeTask(userId, taskNumber);
      }
      ctx.reply(config.telegram.messages.done, mainKeyboard);
    } catch (error) {
      // Check if browser was closed
      if (error.message.includes('closed') || error.message.includes('Target page') || error.message.includes('context')) {
        ctx.reply(config.telegram.messages.browser_closed, authKeyboard);
        ctx.session = { action: null, step: null, authenticated: false };
      } else {
        ctx.reply(config.telegram.messages.error.replace('%s', error.message), mainKeyboard);
      }
    }
    ctx.session = { action: null, step: null, authenticated: true };
    return;
  }

  // Step 2: Enter new name for RENAME
  if (step === 'enter_new_name') {
    const newTaskText = ctx.message.text.trim();
    const taskIndex = tasks.indexOf(selectedTask);
    ctx.reply(config.telegram.messages.executing);
    try {
      await renameTask(userId, taskIndex, newTaskText);
      ctx.reply(config.telegram.messages.done, mainKeyboard);
    } catch (error) {
      // Check if browser was closed
      if (error.message.includes('closed') || error.message.includes('Target page') || error.message.includes('context')) {
        ctx.reply(config.telegram.messages.browser_closed, authKeyboard);
        ctx.session = { action: null, step: null, authenticated: false };
      } else {
        ctx.reply(config.telegram.messages.error.replace('%s', error.message), mainKeyboard);
      }
    }
    ctx.session = { action: null, step: null, authenticated: true };
    return;
  }

  // ADD_TASK - just text input
  ctx.reply(config.telegram.messages.executing);
  try {
    await addTask(userId, ctx.message.text);
    ctx.reply(config.telegram.messages.done, mainKeyboard);
  } catch (error) {
    // Check if browser was closed
    if (error.message.includes('closed') || error.message.includes('Target page') || error.message.includes('context')) {
      ctx.reply(config.telegram.messages.browser_closed, authKeyboard);
      ctx.session = { action: null, step: null, authenticated: false };
    } else {
      ctx.reply(config.telegram.messages.error.replace('%s', error.message), mainKeyboard);
    }
  }
  ctx.session = { action: null, step: null, authenticated: true };
});

bot.launch();
console.log('Telegram bot started...');

// Initialize browser and notify admins
async function initBrowser() {
  try {
    await browser.ensureRunning();
    // Don't navigate to a page here - each user will have their own session
    console.log('✓ Browser launched and ready for sessions');

    // Send startup notification to all admins (only if they have started the bot)
    if (config.telegram.adminIds.length > 0) {
      for (const adminId of config.telegram.adminIds) {
        try {
          await bot.telegram.sendMessage(
            adminId,
            config.telegram.messages.server_restart,
            authKeyboard
          );
          console.log(`✓ Startup notification sent to admin ${adminId}`);
        } catch (error) {
          console.log(`⚠ Admin ${adminId} not reachable: ${error.message}`);
          console.log(`   Ask them to message the bot first (press /start)`);
        }
      }
    } else {
      console.log('⚠ ADMIN_TELEGRAM_ID not set, skipping notification');
    }
  } catch (error) {
    console.log('⚠ Browser initialization error:', error.message);
  }
}

// Wait for bot to be ready, then open browser
setTimeout(() => {
  initBrowser();
}, config.delays.botInit);

console.log('Browser will open automatically. Use /stop to close it.');

process.once('SIGINT', async () => {
  console.log('\n🛑 Остановка сервера пользователем (Ctrl+C)...');
  await browser.close();
  bot.stop('SIGINT');
  console.log('✅ Сервер остановлен\n');
  process.exit(0);
});

process.once('SIGTERM', async () => {
  console.log('\n🛑 Остановка сервера (SIGTERM)...');
  await browser.close();
  bot.stop('SIGTERM');
  console.log('✅ Сервер остановлен\n');
  process.exit(0);
});
