// net4.xyz Root ESLint Configuration
module.exports = {
  root: true,
  ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/out/**', '**/.next/**'],
  extends: [
    'eslint:recommended'
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
      ],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-console': ['warn', { allow: ['warn', 'error'] }]
      }
    },
    {
      files: ['*.js', '*.mjs'],
      env: {
        node: true,
        es2022: true
      }
    }
  ]
};