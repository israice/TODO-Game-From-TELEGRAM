const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const config = require('./telegram/telegram_config');
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Хранилище сессий в памяти (key: userId)
const sessions = new Map();

// Middleware для управления сессиями
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (userId) {
    // Загружаем сессию или создаём новую
    ctx.session = sessions.get(userId) || { action: null, step: null };
    
    return next().then(() => {
      // Сохраняем сессию после обработки
      if (ctx.session) {
        sessions.set(userId, ctx.session);
        console.log(`Session saved for user ${userId}:`, ctx.session);
      }
    });
  }
  return next();
});

const userTextPath = path.join(__dirname, config.paths.userText);

// Маппинг действий к скриптам
const actionScripts = {
  [config.actions.ADD_TASK]: 'auto_TODO/add_task.js',
  [config.actions.DELETE_TASK]: 'auto_TODO/delete_task.js',
  [config.actions.RENAME_TASK]: 'auto_TODO/rename_task.js',
  [config.actions.COMPLETE_TASK]: 'auto_TODO/complete_task.js',
  'get_tasks': 'auto_TODO/get_tasks.js'
};

// Функция запуска скрипта
function executeScript(action) {
  const scriptPath = path.join(__dirname, actionScripts[action]);
  return new Promise((resolve, reject) => {
    const proc = exec(`node "${scriptPath}"`, { cwd: __dirname });
    
    proc.stdout.on('data', (data) => {
      console.log(`[${action}] ${data}`);
    });
    
    proc.stderr.on('data', (data) => {
      console.error(`[${action}] ERROR: ${data}`);
    });
    
    proc.on('close', (code) => {
      // Для get_tasks проверяем наличие файла с задачами
      if (action === 'get_tasks') {
        const tasksPath = path.join(__dirname, 'telegram', 'telegram_tasks.js');
        try {
          if (fs.existsSync(tasksPath)) {
            // Очищаем кэш перед чтением
            delete require.cache[require.resolve(tasksPath)];
            const tasks = require(tasksPath);
            console.log('get_tasks result:', tasks);
            resolve(tasks);
          } else {
            reject(new Error('Tasks file not found'));
          }
        } catch (err) {
          reject(err);
        }
      } else if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
}

// Inline клавиатура с кнопками (2 строки по 2 кнопки)
const mainKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback(config.buttons.add_task, config.actions.ADD_TASK),
    Markup.button.callback(config.buttons.delete_task, config.actions.DELETE_TASK)
  ],
  [
    Markup.button.callback(config.buttons.rename_task, config.actions.RENAME_TASK),
    Markup.button.callback(config.buttons.complete_task, config.actions.COMPLETE_TASK)
  ]
]);

bot.start((ctx) => {
  ctx.reply(config.messages.start, mainKeyboard);
});

// Обработка нажатий на кнопки
bot.action(config.actions.ADD_TASK, (ctx) => {
  ctx.reply(config.messages.prompts.add_task);
  ctx.session = { action: config.actions.ADD_TASK };
});

// Для DELETE, RENAME, COMPLETE — сначала загружаем список задач
async function loadAndShowTasks(ctx, action) {
  ctx.reply(config.messages.loading_tasks);

  try {
    const tasks = await executeScript('get_tasks');

    if (tasks.length === 0) {
      ctx.reply(config.messages.no_tasks, mainKeyboard);
      ctx.session = { action: null };
      return;
    }

    // Формируем список с номерами
    const taskList = tasks.map((task, i) => `${i + 1}. ${task}`).join('\n');
    await ctx.reply(config.messages.task_list.replace('%s', taskList));

    // Сохраняем только действие и шаг (tasks читаем из файла)
    ctx.session = { action, step: 'select_task' };
    console.log('Session set:', ctx.session, 'for user', ctx.from.id);
  } catch (error) {
    console.error('loadAndShowTasks error:', error);
    ctx.reply(`❌ Ошибка загрузки задач: ${error.message}`, mainKeyboard);
    ctx.session = { action: null };
  }
}

bot.action(config.actions.DELETE_TASK, async (ctx) => {
  await loadAndShowTasks(ctx, config.actions.DELETE_TASK);
});

bot.action(config.actions.RENAME_TASK, async (ctx) => {
  await loadAndShowTasks(ctx, config.actions.RENAME_TASK);
});

bot.action(config.actions.COMPLETE_TASK, async (ctx) => {
  await loadAndShowTasks(ctx, config.actions.COMPLETE_TASK);
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  const session = ctx.session || {};
  const action = session.action;
  const step = session.step;

  console.log('Text received:', ctx.message.text, 'from user', ctx.from.id);
  console.log('Session:', session);

  // Игнорируем текст, если не выбрано действие
  if (!action) {
    console.log('No action in session, replying with no_action');
    ctx.reply(config.messages.no_action, mainKeyboard);
    return;
  }

  // Шаг 1: Выбор задачи по номеру (для DELETE, RENAME, COMPLETE)
  if (step === 'select_task') {
    const taskNumber = parseInt(ctx.message.text.trim()) - 1;

    // Читаем задачи из файла (с очисткой кэша)
    const tasksPath = path.join(__dirname, 'telegram', 'telegram_tasks.js');
    let tasks = [];
    try {
      delete require.cache[require.resolve(tasksPath)];
      tasks = require(tasksPath);
      console.log('Tasks loaded:', tasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
      ctx.reply('❌ Ошибка чтения списка задач. Попробуйте снова.');
      ctx.session = { action: null, step: null };
      return;
    }

    if (isNaN(taskNumber) || taskNumber < 0 || taskNumber >= tasks.length) {
      ctx.reply(config.messages.invalid_number);
      return;
    }

    const selectedTask = tasks[taskNumber];
    console.log('Selected task:', selectedTask, 'Action:', action);

    // Для RENAME — нужно ещё ввести новое имя
    if (action === config.actions.RENAME_TASK) {
      ctx.session = { action, step: 'enter_new_name', selectedTask };
      ctx.reply('Введите новое имя для задачи:');
      return;
    }

    // Для DELETE и COMPLETE — сразу выполняем действие
    const content = `module.exports = {\n  action: '${action}',\n  text: ${JSON.stringify(selectedTask)},\n  taskIndex: ${taskNumber + 1}\n};\n`;
    fs.writeFileSync(userTextPath, content);
    console.log('Saved to userText:', { action, text: selectedTask, taskIndex: taskNumber + 1 });

    ctx.reply(config.messages.executing);

    try {
      console.log('Executing script:', action);
      await executeScript(action);
      ctx.reply('✅ Готово!', mainKeyboard);
    } catch (error) {
      console.error('Script error:', error);
      ctx.reply(`❌ Ошибка: ${error.message}`, mainKeyboard);
    }

    ctx.session = { action: null, step: null };
    return;
  }

  // Шаг 2: Ввод нового имени для RENAME
  if (step === 'enter_new_name') {
    const oldTaskText = session.selectedTask;
    const newTaskText = ctx.message.text.trim();

    // Читаем задачи из файла для получения индекса
    const tasksPath = path.join(__dirname, 'telegram', 'telegram_tasks.js');
    let tasks = [];
    try {
      tasks = require(tasksPath);
    } catch (err) {
      ctx.reply('❌ Ошибка чтения списка задач. Попробуйте снова.');
      ctx.session = { action: null, step: null };
      return;
    }

    const taskIndex = tasks.indexOf(oldTaskText) + 1;

    const content = `module.exports = {\n  action: '${action}',\n  oldText: ${JSON.stringify(oldTaskText)},\n  newText: ${JSON.stringify(newTaskText)},\n  taskIndex: ${taskIndex}\n};\n`;
    fs.writeFileSync(userTextPath, content);

    ctx.reply(config.messages.executing);

    try {
      await executeScript(action);
      ctx.reply('✅ Готово!', mainKeyboard);
    } catch (error) {
      ctx.reply(`❌ Ошибка: ${error.message}`, mainKeyboard);
    }

    ctx.session = { action: null, step: null };
    return;
  }

  // Для ADD_TASK — просто текст задачи
  const userText = ctx.message.text;

  // Сохраняем данные в файл
  const content = `module.exports = {\n  action: '${action}',\n  text: ${JSON.stringify(userText)}\n};\n`;
  fs.writeFileSync(userTextPath, content);

  ctx.reply(config.messages.executing);

  try {
    await executeScript(action);
    ctx.reply('✅ Готово!', mainKeyboard);
  } catch (error) {
    ctx.reply(`❌ Ошибка: ${error.message}`, mainKeyboard);
  }

  ctx.session = { action: null, step: null };
});

// Обработка неизвестных callback
bot.on('callback_query', (ctx) => {
  ctx.answerCbQuery();
});

bot.launch();

console.log('Telegram bot started...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
