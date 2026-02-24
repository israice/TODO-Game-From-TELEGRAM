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
      complete_task: '✅ Выполнить',
      show_tasks: '📋 Показать задачи'
    },
    actions: {
      LOGIN: 'login',
      REGISTER: 'register',
      ADD_TASK: 'add_task',
      DELETE_TASK: 'delete_task',
      RENAME_TASK: 'rename_task',
      COMPLETE_TASK: 'complete_task',
      SHOW_TASKS: 'show_tasks'
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
        register_username_prompt: 'Введите имя пользователя для регистрации:',
        register_password_prompt: 'Введите пароль:',
        rename_prompt: 'Введите новое имя для задачи:',
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
      error: '❌ Ошибка: %s',
      browser_closed: '❌ Пожалуйста, авторизуйтесь заново.',
      server_restart: '🔄 Сервер перезапустился. Требуется авторизация.',
      session_error: '❌ Ошибка сессии. Начните сначала: /start',
      taskIndexOutOfRange: '✗ Task index %d out of range (total: %d)'
    }
  },

  // === Browser / Playwright Config ===
  browser: {
    headless: false,
    loginUrl: 'https://todo.weforks.org/',
    registerUrl: 'https://todo.weforks.org/register',
    successUrlPattern: /\/dashboard|\/todos|\/home/i,
    loginTimeout: 2000,
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
    buttonName: 'Создать аккаунт',
    usernameField: '#register-username',
    passwordField: '#register-password'
  },

  // === Task Selectors ===
  tasks: {
    listSelector: '#tasks-list',
    itemSelector: '#tasks-list > li > span.task-text',
    itemWrapperSelector: '#tasks-list > li',
    inputSelector: '#task-input',
    addButtonSelector: '#add-btn > span.btn-icon',
    checkboxSelector: 'label > input[type="checkbox"]',
    deleteButtonSelector: 'button',
    taskTextSelector: 'span.task-text'
  },

  // === Common Selectors ===
  selectors: {
    tabs: 'body > div > div.card > div.tabs > button.tab',
    errorMessages: '.error, .error-message, [class*="error"], .alert-danger'
  },

  // === Timeouts (ms) ===
  timeouts: {
    // Page load and form timeouts
    pageLoad: 3000,
    loginForm: 1000,
    registrationForm: 1000,
    taskList: 3000,
    // Success check timeouts
    loginSuccess: 1000,
    registrationSuccess: 1000,
    // Error handling
    selectorWait: 3000
  },

  // === Delays (ms) ===
  delays: {
    afterLogin: 200,
    beforeTaskAction: 500,
    afterTaskAction: 300,
    beforeClose: 3000,
    // Registration flow delays
    beforeRegisterTab: 200,
    afterRegisterTab: 0,
    afterRegistration: 100,
    afterLoginTab: 0,
    // Bot initialization
    botInit: 2000
  },

  // === Credentials ===
  credentials: {
    username: process.env.TODO_USERNAME,
    password: process.env.TODO_PASSWORD
  }
};
