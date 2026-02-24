const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const browser = require('./browser');
const getTasks = require('./tasks/get');
const addTask = require('./tasks/add');
const deleteTask = require('./tasks/delete');
const renameTask = require('./tasks/rename');
const completeTask = require('./tasks/complete');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// In-memory session storage
const sessions = new Map();

bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (userId) {
    ctx.session = sessions.get(userId) || { action: null, step: null };
    return next().then(() => {
      if (ctx.session) sessions.set(userId, ctx.session);
    });
  }
  return next();
});

// Inline keyboard with action buttons
const mainKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback(config.telegram.buttons.add_task, config.telegram.actions.ADD_TASK),
    Markup.button.callback(config.telegram.buttons.delete_task, config.telegram.actions.DELETE_TASK)
  ],
  [
    Markup.button.callback(config.telegram.buttons.rename_task, config.telegram.actions.RENAME_TASK),
    Markup.button.callback(config.telegram.buttons.complete_task, config.telegram.actions.COMPLETE_TASK)
  ]
]);

bot.start((ctx) => ctx.reply(config.telegram.messages.start, mainKeyboard));

// Command to close browser
bot.command('stop', async (ctx) => {
  await browser.close();
  ctx.reply('🛑 Браузер закрыт');
});

bot.action(config.telegram.actions.ADD_TASK, (ctx) => {
  ctx.reply(config.telegram.messages.prompts.add_task);
  ctx.session = { action: config.telegram.actions.ADD_TASK };
});

// Load and show tasks for DELETE, RENAME, COMPLETE
async function loadAndShowTasks(ctx, action) {
  ctx.reply(config.telegram.messages.loading_tasks);
  try {
    const tasks = await getTasks();
    if (tasks.length === 0) {
      ctx.reply(config.telegram.messages.no_tasks, mainKeyboard);
      ctx.session = { action: null };
      return;
    }
    const taskList = tasks.map((task, i) => `${i + 1}. ${task}`).join('\n');
    await ctx.reply(config.telegram.messages.task_list.replace('%s', taskList));
    ctx.session = { action, step: 'select_task', tasks };
  } catch (error) {
    ctx.reply(config.telegram.messages.error.replace('%s', error.message), mainKeyboard);
    ctx.session = { action: null };
  }
}

bot.action(config.telegram.actions.DELETE_TASK, (ctx) => loadAndShowTasks(ctx, config.telegram.actions.DELETE_TASK));
bot.action(config.telegram.actions.RENAME_TASK, (ctx) => loadAndShowTasks(ctx, config.telegram.actions.RENAME_TASK));
bot.action(config.telegram.actions.COMPLETE_TASK, (ctx) => loadAndShowTasks(ctx, config.telegram.actions.COMPLETE_TASK));

// Handle text messages
bot.on('text', async (ctx) => {
  const session = ctx.session || {};
  const { action, step, tasks, selectedTask } = session;

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
      ctx.session = { action, step: 'enter_new_name', tasks, selectedTask };
      ctx.reply('Введите новое имя для задачи:');
      return;
    }

    // DELETE or COMPLETE - execute immediately
    ctx.reply(config.telegram.messages.executing);
    try {
      if (action === config.telegram.actions.DELETE_TASK) {
        await deleteTask(taskNumber);
      } else if (action === config.telegram.actions.COMPLETE_TASK) {
        await completeTask(taskNumber);
      }
      ctx.reply(config.telegram.messages.done, mainKeyboard);
    } catch (error) {
      ctx.reply(config.telegram.messages.error.replace('%s', error.message), mainKeyboard);
    }
    ctx.session = { action: null, step: null };
    return;
  }

  // Step 2: Enter new name for RENAME
  if (step === 'enter_new_name') {
    const newTaskText = ctx.message.text.trim();
    const taskIndex = tasks.indexOf(selectedTask);
    ctx.reply(config.telegram.messages.executing);
    try {
      await renameTask(taskIndex, newTaskText);
      ctx.reply(config.telegram.messages.done, mainKeyboard);
    } catch (error) {
      ctx.reply(config.telegram.messages.error.replace('%s', error.message), mainKeyboard);
    }
    ctx.session = { action: null, step: null };
    return;
  }

  // ADD_TASK - just text input
  ctx.reply(config.telegram.messages.executing);
  try {
    await addTask(ctx.message.text);
    ctx.reply(config.telegram.messages.done, mainKeyboard);
  } catch (error) {
    ctx.reply(config.telegram.messages.error.replace('%s', error.message), mainKeyboard);
  }
  ctx.session = { action: null, step: null };
});

bot.launch();
console.log('Telegram bot started...');
console.log('Browser will stay open between actions. Use /stop to close it.');

process.once('SIGINT', async () => {
  console.log('Shutting down...');
  await browser.close();
  bot.stop('SIGINT');
});

process.once('SIGTERM', async () => {
  console.log('Shutting down...');
  await browser.close();
  bot.stop('SIGTERM');
});
