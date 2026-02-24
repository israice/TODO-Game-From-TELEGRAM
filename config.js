require('dotenv').config();

module.exports = {
  // === Telegram Bot Config ===
  telegram: {
    adminIds: process.env.ADMIN_TELEGRAM_ID?.split(',').map(id => id.trim()).filter(id => id.length > 0) || [],
    buttons: {
      login: '🔑 Login',
      register: '📝 Registration',
      add_task: '📝 Добавить задание',
      delete_task: '🗑️ Удалить задание',
      rename_task: '✏️ Переименовать',
      complete_task: '✅ Выполнить'
    },
    actions: {
      LOGIN: 'login',
      REGISTER: 'register',
      ADD_TASK: 'add_task',
      DELETE_TASK: 'delete_task',
      RENAME_TASK: 'rename_task',
      COMPLETE_TASK: 'complete_task'
    },
    messages: {
      auth: {
        start: 'Выберите действие:\nЕсли у вас уже есть аккаунт — нажмите Login, иначе — Registration',
        login_prompt: 'Введите ваше имя пользователя:',
        password_prompt: 'Введите пароль:',
        login_success: '✅ Успешный вход! Теперь вы можете управлять задачами.',
        login_failed: '❌ Неверное имя пользователя или пароль. Попробуйте снова.',
        register_success: '✅ Регистрация успешна! Теперь вы можете войти.',
        register_failed: '❌ Ошибка регистрации: %s',
        back_to_auth: '🔙 Вернуться к авторизации'
      },
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
    registerUrl: 'https://todo.weforks.org/register',
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

  // === Registration Form Selectors ===
  register: {
    usernamePlaceholder: 'Введите имя пользователя',
    passwordPlaceholder: 'Введите пароль',
    confirmPasswordPlaceholder: 'Повторите пароль',
    buttonName: 'Зарегистрироваться'
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
