module.exports = {
  testEnvironment: 'node',
  // Sets NODE_ENV / JWT_SECRET / in-memory DATABASE_PATH before any app code loads,
  // so tests never touch the development database.
  setupFiles: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'config/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'validators/**/*.js',
    'utils/**/*.js',
    'app.js',
  ],
};
