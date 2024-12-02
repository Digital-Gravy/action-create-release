module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js'],
  testMatch: ['**/*.test.js'],
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ['*.js', '!jest.config.js', '!.eslintrc.js', '!jest.setup.js'],
  setupFiles: ['./jest.setup.js'],
};
