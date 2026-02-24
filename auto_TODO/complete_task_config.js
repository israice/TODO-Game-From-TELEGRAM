module.exports = {
  // Browser settings
  headless: false,

  // Timeouts (ms)
  loginTimeout: 10000,
  pollInterval: 500,

  // Target URL
  loginUrl: 'https://todo.weforks.org/',

  // URL patterns to detect successful login (regex)
  successUrlPattern: /\/dashboard|\/todos|\/home/i,

  // Login form selectors
  usernamePlaceholder: 'Введите имя пользователя',
  passwordPlaceholder: 'Введите пароль',
  loginButtonName: 'Начать приключение',

  // Task text to find and complete (via checkbox) (fallback if no user input)
  taskText: '321',

  // Path to user text file (relative to project root)
  paths: {
    userText: 'telegram/telegram_text.js'
  },

  // Delays (ms)
  delays: {
    afterLogin: 500,
    beforeTaskAction: 500,
    afterTaskAction: 300,
    beforeClose: 3000,
  },

  // Console messages
  messages: {
    loginComplete: '✓ Login complete. Task completed.',
    browserClosed: '✓ Browser closed. Exiting...',
    urlWaitFailed: '⚠ URL change not detected, continuing...',
    error: '✗ Error:',
  },
};
