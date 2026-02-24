require('dotenv').config();

module.exports = {
  // === Telegram Bot Config ===
  telegram: {
    buttons: {
      add_task: '📝 Добавить задание',
      delete_task: '🗑️ Удалить задание',
      rename_task: '✏️ Переименовать',
      complete_task: '✅ Выполнить'
    },
    actions: {
      ADD_TASK: 'add_task',
      DELETE_TASK: 'delete_task',
      RENAME_TASK: 'rename_task',
      COMPLETE_TASK: 'complete_task'
    },
    messages: {
      start: 'Выберите действие:',
      prompts: {
        add_task: 'Введите текст для нового задания:'
      },
      no_action: 'Сначала выберите действие из меню:',
      executing: '✅ Выполняю...',
      loading_tasks: '📋 Загружаю список задач...',
      no_tasks: '❌ Список задач пуст',
      task_list: '📝 Ваши задачи:\n\n%s\n\nВведите номер:',
      invalid_number: '❌ Неверный номер. Попробуйте снова:',
      done: '✅ Готово!',
      error: '❌ Ошибка: %s'
    }
  },

  // === Browser / Playwright Config ===
  browser: {
    headless: false,
    loginUrl: 'https://todo.weforks.org/',
    successUrlPattern: /\/dashboard|\/todos|\/home/i,
    loginTimeout: 10000,
    pollInterval: 500
  },

  // === Login Form Selectors ===
  login: {
    usernamePlaceholder: 'Введите имя пользователя',
    passwordPlaceholder: 'Введите пароль',
    buttonName: 'Начать приключение'
  },

  // === Task Selectors ===
  tasks: {
    listSelector: '#tasks-list',
    itemSelector: '#tasks-list > li > span.task-text',
    inputSelector: '#task-input',
    addButtonSelector: '#add-btn > span.btn-icon'
  },

  // === Delays (ms) ===
  delays: {
    afterLogin: 500,
    beforeTaskAction: 500,
    afterTaskAction: 300,
    beforeClose: 3000
  },

  // === Credentials ===
  credentials: {
    username: process.env.TODO_USERNAME,
    password: process.env.TODO_PASSWORD
  }
};
