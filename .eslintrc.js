module.exports = {
  env: {
    node: true,
    es2021: true,
    'jest/globals': true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  plugins: ['jest', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/valid-expect': 'error',
  },
  overrides: [
    {
      // Configuration specifically for test files
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true, // Enables Jest global variables
      },
      rules: {
        'no-unused-vars': [
          'error',
          {
            // Allow unused variables that start with underscore
            argsIgnorePattern: '^_',
            // Allow variables used only in expects
            varsIgnorePattern: '^_',
            // Don't check variables used in expectations
            args: 'none',
          },
        ],
      },
    },
  ],
};
