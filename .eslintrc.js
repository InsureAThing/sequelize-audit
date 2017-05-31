module.exports = {
  parser: 'babel-eslint',
  plugins: ['prettier', 'jest'],
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      modules: true,
    },
  },
  env: {
    browser: true,
    amd: true,
    es6: true,
    node: true,
    'jest/globals': true,
  },
  rules: {
    'comma-dangle': 0,
    'no-undef': 1,
    'global-strict': 0,
    'no-extra-semi': 1,
    'no-underscore-dangle': 0,
    'no-console': 1,
    'no-unused-vars': 1,
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        trailingComma: 'es5',
        semi: true,
      },
    ],
  },
};
