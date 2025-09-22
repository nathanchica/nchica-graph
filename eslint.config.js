import js from '@eslint/js';
import graphqlPlugin, { processors as graphqlProcessors } from '@graphql-eslint/eslint-plugin';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

const graphqlSchemaRules = {
    '@graphql-eslint/known-type-names': 'error',
    '@graphql-eslint/no-duplicate-fields': 'error',
    '@graphql-eslint/no-unreachable-types': 'error',
    '@graphql-eslint/naming-convention': [
        'error',
        {
            ObjectTypeDefinition: 'PascalCase',
            InterfaceTypeDefinition: 'PascalCase',
            UnionTypeDefinition: 'PascalCase',
            ScalarTypeDefinition: 'PascalCase',
            EnumTypeDefinition: 'PascalCase',
            InputObjectTypeDefinition: 'PascalCase',
            EnumValueDefinition: 'UPPER_CASE',
            FieldDefinition: 'camelCase',
            InputValueDefinition: 'camelCase',
            ArgumentDefinition: 'camelCase',
            DirectiveDefinition: 'camelCase',
            allowLeadingUnderscore: true,
        },
    ],
    '@graphql-eslint/require-description': [
        'error',
        {
            types: true,
            rootField: true,
            ObjectTypeDefinition: true,
            InterfaceTypeDefinition: true,
            EnumTypeDefinition: true,
            ScalarTypeDefinition: true,
            InputObjectTypeDefinition: true,
            UnionTypeDefinition: true,
            FieldDefinition: true,
            InputValueDefinition: false,
            EnumValueDefinition: true,
            DirectiveDefinition: true,
        },
    ],
};

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
        files: ['**/*.{graphql,gql,graphqls}'],
        plugins: {
            '@graphql-eslint': graphqlPlugin,
        },
        languageOptions: {
            parser: graphqlPlugin.parser,
        },
        rules: graphqlSchemaRules,
    },

    {
        files: ['**/*.schema.{ts,tsx,js,jsx}'],
        plugins: {
            '@graphql-eslint': graphqlPlugin,
        },
        processor: graphqlProcessors.graphql,
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
