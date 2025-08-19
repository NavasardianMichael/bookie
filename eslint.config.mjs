import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import a11y from 'eslint-plugin-jsx-a11y'
import security from 'eslint-plugin-security'
import eslintPluginPrettier from 'eslint-plugin-prettier'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      'node_modules/',
      '.next/',
      'out/',
      'build/',
      'dist/',
      'public/',
      '*.config.js',
      'next.config.js',
      '.env*',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
      prettier: eslintPluginPrettier,
      // 'jsx-a11y': a11y,
      security,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Security rules
      ...security.configs.recommended.rules,
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',

      // Accessibility rules
      ...a11y.configs.recommended.rules,
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/interactive-supports-focus': 'warn',
      // 'jsx-a11y/alt-text': 'error',
      // 'jsx-a11y/anchor-has-content': 'error',
      // 'jsx-a11y/aria-props': 'error',
      // 'jsx-a11y/aria-proptypes': 'error',
      // 'jsx-a11y/aria-unsupported-elements': 'error',
      // 'jsx-a11y/role-has-required-aria-props': 'error',

      // Performance rules
      // 'react/jsx-no-bind': 'warn',
      'react/jsx-no-useless-fragment': 'error',
      'react/self-closing-comp': 'error',

      // Code quality
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      eqeqeq: ['error', 'always'],

      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      'security/detect-object-injection': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            [
              '^react',
              '^@?\\w',
              '@assets/',
              '@test/',
              '@configs/',
              '@services/',
              '@routes/',
              '@api/',
              '@store/',
              '@contexts/',
              '@hooks/',
              '@types/',
              '@interfaces/',
              '@constants/',
              '@helpers/',
              '@utils/',
              '@components/',
              '@styles/',
              '^\\.',
              '^\\.\\.',
              '\\.css',
            ],
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/app/**/page.{ts,tsx}',
      '**/app/**/layout.{ts,tsx}',
      '**/app/**/loading.{ts,tsx}',
      '**/app/**/error.{ts,tsx}',
      '**/app/**/not-found.{ts,tsx}',
    ],
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: ['metadata', 'generateMetadata', 'generateStaticParams', 'generateViewport'],
        },
      ],
    },
  },
]

export default eslintConfig
