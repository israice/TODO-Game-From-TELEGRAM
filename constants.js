// === Selectors ===
module.exports.selectors = {
  tabs: 'body > div > div.card > div.tabs > button.tab',
  errorMessages: '.error, .error-message, [class*="error"], .alert-danger'
};

// === Login Form Selectors ===
module.exports.login = {
  usernamePlaceholder: 'Введите имя пользователя',
  passwordPlaceholder: 'Введите пароль',
  buttonName: 'Начать приключение'
};

// === Registration Form Selectors ===
module.exports.register = {
  usernamePlaceholder: 'Введите имя пользователя',
  passwordPlaceholder: 'Введите пароль',
  confirmPasswordPlaceholder: 'Повторите пароль',
  buttonName: 'Создать аккаунт',
  usernameField: '#register-username',
  passwordField: '#register-password'
};

// === Task Selectors ===
module.exports.tasks = {
  listSelector: '#tasks-list',
  itemSelector: '#tasks-list > li > span.task-text',
  itemWrapperSelector: '#tasks-list > li',
  inputSelector: '#task-input',
  addButtonSelector: '#add-btn > span.btn-icon',
  checkboxSelector: 'label > input[type="checkbox"]',
  deleteButtonSelector: 'button',
  taskTextSelector: 'span.task-text'
};

// === Timeouts (ms) ===
module.exports.timeouts = {
  pageLoad: 3000,
  loginForm: 1000,
  registrationForm: 1000,
  taskList: 3000,
  loginSuccess: 1000,
  registrationSuccess: 1000,
  selectorWait: 3000
};

// === Delays (ms) ===
module.exports.delays = {
  afterLogin: 200,
  beforeTaskAction: 500,
  afterTaskAction: 300,
  beforeClose: 3000,
  beforeRegisterTab: 200,
  afterRegisterTab: 0,
  afterRegistration: 100,
  afterLoginTab: 0,
  botInit: 2000
};

// === Browser Config ===
module.exports.browser = {
  headless: false,
  loginUrl: 'https://todo.weforks.org/',
  registerUrl: 'https://todo.weforks.org/register',
  successUrlPattern: /\/dashboard|\/todos|\/home/i,
  loginTimeout: 2000,
  pollInterval: 500
};
