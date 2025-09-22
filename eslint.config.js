import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    prettierConfig,

    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/*.min.js',
            'eslint.config.js',
            '**/*.config.js',
            '**/*.config.ts',
            '**/vite.config.ts',
            '.husky/**',
        ],
    },

    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                exports: 'writable',
                module: 'writable',
                require: 'readonly',
                global: 'readonly',
                document: 'readonly',
                window: 'readonly',
                navigator: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                RequestInit: 'readonly',
                Response: 'readonly',
                Request: 'readonly',
                Headers: 'readonly',
                // Timer functions
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                // Node.js types
                NodeJS: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            'react-hooks': reactHooksPlugin,
            import: importPlugin,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            'react-hooks/rules-of-hooks': 'off',
            'react-hooks/exhaustive-deps': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-console': 'off',
            'import/order': [
                'warn',
                {
                    groups: ['builtin', 'external', 'internal', 'sibling', 'parent', 'index'],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: false,
                    },
                },
            ],
            'import/extensions': [
                'error',
                'ignorePackages',
                {
                    js: 'always',
                    ts: 'never',
                    tsx: 'never',
                },
            ],
        },
        settings: {
            react: { version: 'detect' },
        },
    },
];
