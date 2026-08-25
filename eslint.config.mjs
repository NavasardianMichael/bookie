import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierConfig from 'eslint-config-prettier/flat'
import eslintPluginPrettier from 'eslint-plugin-prettier'
import a11y from 'eslint-plugin-jsx-a11y'
import reactRefresh from 'eslint-plugin-react-refresh'
import security from 'eslint-plugin-security'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  security.configs.recommended,
  globalIgnores([
    'node_modules/',
    '.next/',
    'out/',
    'build/',
    'dist/',
    'public/',
    '*.config.js',
    'next.config.js',
    '.env*',
    'next-env.d.ts',
    'server/**/*.d.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
      prettier: eslintPluginPrettier,
    },
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-regexp': 'warn',

      ...a11y.configs.recommended.rules,
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/interactive-supports-focus': 'warn',

      'react/jsx-no-useless-fragment': 'error',
      'react/self-closing-comp': 'error',

      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      eqeqeq: ['error', 'always'],

      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
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
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['tests/**/*.ts', '*.config.{ts,mts}'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Fixtures deliberately build partial entities and cast at the call site; the
      // alternative is reproducing whole object graphs for a two-field assertion.
      '@typescript-eslint/no-explicit-any': 'off',
      // Test doubles routinely pass shapes narrower than the real type.
      'security/detect-object-injection': 'off',
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
          allowExportNames: [
            'metadata',
            'generateMetadata',
            'generateStaticParams',
            'viewport',
            'generateViewport',
            'dynamic',
            'revalidate',
          ],
        },
      ],
    },
  },
])

export default eslintConfig
