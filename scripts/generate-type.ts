/**
 * Script to scaffold a new GraphQL type with schema, resolver, and index files.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';

import invariant from 'tiny-invariant';

function toPascalCase(value: string): string {
    const words = value
        .trim()
        .replace(/[^A-Za-z0-9]+/g, ' ')
        .split(' ')
        .filter(Boolean);
    const joined = words.map((w) => w[0]?.toUpperCase() + w.slice(1)).join('');
    return joined || 'NewType';
}

function lowerFirst(value: string): string {
    return value ? value[0].toLowerCase() + value.slice(1) : value;
}

function makeSchemaContent(typeName: string, typeDescription: string, camelName: string): string {
    const defsConst = `${camelName}Defs`;
    return `export const ${defsConst} = /* GraphQL */ \`
    """
    ${typeDescription}
    """
    type ${typeName} {
        """
        Placeholder field for ${typeName}
        """
        placeholder: String!
    }
\`;
`;
}

function makeResolverContent(typeName: string, camelName: string): string {
    const resolversConst = `${camelName}Resolvers`;
    return `import type { GraphQLContext } from '../../context.js';

export type ${typeName}Parent = {
    __typename: '${typeName}';
    placeholder: string;
};

export function create${typeName}Parent(data: Partial<${typeName}Parent> = {}): ${typeName}Parent {
    return {
        __typename: '${typeName}',
        placeholder: data.placeholder ?? 'TODO',
        ...data,
    };
}

export const ${resolversConst} = {
    ${typeName}: {
        placeholder: (parent: ${typeName}Parent, _args: unknown, _ctx: GraphQLContext) => parent.placeholder ?? 'TODO',
    },
};
`;
}

function makeIndexContent(camelName: string): string {
    const defsConst = `${camelName}Defs`;
    const resolversConst = `${camelName}Resolvers`;
    return `export { ${defsConst} } from './${camelName}.schema.js';
export { ${resolversConst} } from './${camelName}.resolver.js';
`;
}

function makeTestContent(typeName: string, camelName: string): string {
    return `import { createTestClient, type TestGraphQLClient } from '../../../mocks/client.js';

describe('${camelName}Resolvers', () => {
    let client: TestGraphQLClient;

    beforeEach(() => {
        client = createTestClient();
    });

    describe('${typeName}.placeholder', () => {
        it('resolves', async () => {
            console.log('TODO: implement ${camelName}Resolvers tests', client);
            return; // TODO
        });
    });
});
`;
}

async function ensureDir(dir: string) {
    try {
        await fs.mkdir(dir, { recursive: false });
    } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
            throw new Error(`Directory already exists: ${dir}`);
        }
        throw err;
    }
}

async function updateCodegenMappers(typeName: string, camelName: string) {
    const codegenPath = 'codegen.ts';
    let content = await fs.readFile(codegenPath, 'utf8');

    const mapperKey = typeName;
    const mapperValue = `../schema/${camelName}/${camelName}.resolver.js#${typeName}Parent`;

    // Find the mappers object within the codegen config
    const mappersLabelIdx = content.indexOf('mappers:');
    invariant(mappersLabelIdx !== -1, 'Could not find mappers: label in codegen.ts');

    // Locate the opening brace for mappers
    const openBraceIdx = content.indexOf('{', mappersLabelIdx);
    invariant(openBraceIdx !== -1, 'Malformed codegen.ts: missing "{" after mappers:');

    // Find matching closing brace by simple brace counting
    let index = openBraceIdx + 1;
    let depth = 1;
    while (index < content.length && depth > 0) {
        const char = content[index];
        if (char === '{') depth++;
        else if (char === '}') depth--;
        index++;
    }
    if (depth !== 0) throw new Error('Malformed codegen.ts: unmatched braces in mappers block');

    const closeBraceIdx = index - 1; // index of the closing '}'
    const mappersBody = content.slice(openBraceIdx + 1, closeBraceIdx);

    // Parse existing entries robustly: match key: 'value' pairs across single/multi-line
    const entries = new Map<string, string>();
    const pairRe = /([A-Za-z0-9_]+)\s*:\s*'([^']+)'/g;
    let match: RegExpExecArray | null;
    while ((match = pairRe.exec(mappersBody)) !== null) {
        entries.set(match[1], match[2]);
    }

    // Insert or update the new mapper
    entries.set(mapperKey, mapperValue);

    // Sort keys alphabetically
    const sortedKeys = Array.from(entries.keys()).sort((a, b) => a.localeCompare(b));

    // Rebuild as a single line; Prettier will format later
    const singleLine = ' ' + sortedKeys.map((k) => `${k}: '${entries.get(k)}'`).join(', ') + ' ';
    content = content.slice(0, openBraceIdx + 1) + singleLine + content.slice(closeBraceIdx);

    await fs.writeFile(codegenPath, content, 'utf8');
}

async function integrateIntoSchemaIndex(camelName: string) {
    const schemaIndexPath = path.join('src', 'schema', 'index.ts');
    let content = await fs.readFile(schemaIndexPath, 'utf8');

    const importLine = `import { ${camelName}Defs, ${camelName}Resolvers } from './${camelName}/index.js';`;
    if (!content.includes(`'./${camelName}/index.js'`) && !content.includes(`"./${camelName}/index.js"`)) {
        // Insert after the last import line
        const lines = content.split('\n');
        let lastImportIdx = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ')) lastImportIdx = i;
        }
        if (lastImportIdx >= 0) {
            lines.splice(lastImportIdx + 1, 0, importLine);
            content = lines.join('\n');
        } else {
            // Fallback: prepend
            content = `${importLine}\n${content}`;
        }
    }

    // Add to mergeTypeDefs([...])
    const typeDefsMarker = 'const typeDefs = mergeTypeDefs([';
    const typeDefsIdx = content.indexOf(typeDefsMarker);
    if (typeDefsIdx === -1) throw new Error('Could not find typeDefs declaration in src/schema/index.ts');
    const typeDefsEndIdx = content.indexOf(']);', typeDefsIdx);
    if (typeDefsEndIdx === -1) throw new Error('Could not find end of typeDefs merge in src/schema/index.ts');
    const typeDefsSegment = content.slice(typeDefsIdx, typeDefsEndIdx);
    if (!typeDefsSegment.includes(`${camelName}Defs`)) {
        content = content.slice(0, typeDefsEndIdx) + `, ${camelName}Defs` + content.slice(typeDefsEndIdx);
    }

    // Add to mergeResolvers([...])
    const resolversMarker = 'const resolvers = mergeResolvers([';
    const resolversIdx = content.indexOf(resolversMarker);
    if (resolversIdx === -1) throw new Error('Could not find resolvers declaration in src/schema/index.ts');
    // Support both endings:
    //   ]) as unknown as IResolvers<any, GraphQLContext>;
    //   ]);
    let resolversEndIdx = content.indexOf(']);', resolversIdx);
    if (resolversEndIdx === -1) {
        resolversEndIdx = content.indexOf('])', resolversIdx);
    }
    if (resolversEndIdx === -1) {
        throw new Error('Could not find end of resolvers merge in src/schema/index.ts');
    }
    const resolversSegment = content.slice(resolversIdx, resolversEndIdx);
    if (!resolversSegment.includes(`${camelName}Resolvers`)) {
        let updatedSegment: string;
        if (resolversSegment.includes('rootResolvers,')) {
            // Insert before rootResolvers inside the array segment only
            updatedSegment = resolversSegment.replace(
                'rootResolvers,',
                `    ${camelName}Resolvers,\n    rootResolvers,`
            );
        } else {
            // Append to the end of the array segment
            updatedSegment = resolversSegment + `\n    ${camelName}Resolvers,`;
        }
        // Rebuild content with the updated resolvers array segment
        content = content.slice(0, resolversIdx) + updatedSegment + content.slice(resolversEndIdx);
    }

    // After insertion, alphabetize typeDefs and domain-specific resolvers
    content = sortTypeDefsAlphabetically(content);
    content = sortDomainResolversAlphabetically(content);

    await fs.writeFile(schemaIndexPath, content, 'utf8');
}

function sortTypeDefsAlphabetically(content: string): string {
    const regex = /const typeDefs = mergeTypeDefs\(\[([\s\S]*?)\]\);/;
    const match = content.match(regex);
    if (!match) return content;
    const body = match[1];
    const items = Array.from(new Set(body.match(/[A-Za-z0-9_]+Defs/g) || []));
    if (items.length === 0) return content;

    const hasRoot = items.includes('rootTypeDefs');
    const sorted = items.filter((x) => x !== 'rootTypeDefs').sort((a, b) => a.localeCompare(b));
    const newItems = hasRoot ? ['rootTypeDefs', ...sorted] : sorted;
    const replacement = `const typeDefs = mergeTypeDefs([${newItems.join(', ')}]);`;
    return content.replace(regex, replacement);
}

function sortDomainResolversAlphabetically(content: string): string {
    // Match both styles:
    //   const resolvers = mergeResolvers([ ... ]);
    //   const resolvers = mergeResolvers([ ... ]) as unknown as IResolvers<any, GraphQLContext>;
    const arrayRegex = /const resolvers = mergeResolvers\(\[([\s\S]*?)\]\)([^\n]*;)/;
    const arrayMatch = content.match(arrayRegex);
    if (!arrayMatch) return content;
    const arrayBody = arrayMatch[1];
    const arraySuffix = arrayMatch[2] ?? ';';

    // Find domain-specific block up to rootResolvers
    const domainRegex = /(\/\/ Domain-specific resolvers\s*)([\s\S]*?)(\s*rootResolvers,)/;
    const domainMatch = arrayBody.match(domainRegex);
    if (!domainMatch) return content; // If format changes, skip sorting safely

    const domainBody = domainMatch[2];
    const names = Array.from(
        new Set((domainBody.match(/([A-Za-z0-9_]+Resolvers),/g) || []).map((s) => s.replace(',', '')))
    );
    if (names.length <= 1) return content; // Nothing to sort

    const sorted = names.sort((a, b) => a.localeCompare(b));
    const indent = '    ';
    const rebuilt = domainMatch[1] + sorted.map((n) => `${indent}${n},`).join('\n') + domainMatch[3];
    const newArrayBody = arrayBody.replace(domainRegex, rebuilt);
    const replacement = `const resolvers = mergeResolvers([${newArrayBody}])${arraySuffix}`;
    return content.replace(arrayRegex, replacement);
}

function run(cmd: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: 'inherit' });
        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
        });
    });
}

async function formatAndLint(files: string[]): Promise<void> {
    if (!files.length) return;
    try {
        await run('pnpm', ['exec', 'prettier', '--write', ...files]);
    } catch (err) {
        console.warn('Prettier failed:', err instanceof Error ? err.message : err);
    }
    try {
        await run('pnpm', ['exec', 'eslint', '--fix', ...files]);
    } catch (err) {
        console.warn('ESLint failed:', err instanceof Error ? err.message : err);
    }
}

async function main() {
    const rl = createInterface({ input, output });
    try {
        const rawTypeName = (await rl.question('Type name (PascalCase, e.g., NewType): ')).trim();
        const typeDescription = (await rl.question('Type description: ')).trim() || 'Describe this type';

        const typeName = toPascalCase(rawTypeName || 'NewType');
        const camelName = lowerFirst(typeName);
        const baseDir = path.join('src', 'schema', camelName);
        const schemaPath = path.join(baseDir, `${camelName}.schema.ts`);
        const resolverPath = path.join(baseDir, `${camelName}.resolver.ts`);
        const indexPath = path.join(baseDir, `index.ts`);
        const testsDir = path.join(baseDir, '__tests__');
        const testPath = path.join(testsDir, `${camelName}.resolver.test.ts`);

        await ensureDir(baseDir);
        await ensureDir(testsDir);

        const schemaContent = makeSchemaContent(typeName, typeDescription, camelName);
        const resolverContent = makeResolverContent(typeName, camelName);
        const indexContent = makeIndexContent(camelName);
        const testContent = makeTestContent(typeName, camelName);

        await fs.writeFile(schemaPath, schemaContent, 'utf8');
        await fs.writeFile(resolverPath, resolverContent, 'utf8');
        await fs.writeFile(indexPath, indexContent, 'utf8');
        await fs.writeFile(testPath, testContent, 'utf8');

        await integrateIntoSchemaIndex(camelName);
        await updateCodegenMappers(typeName, camelName);

        const schemaIndexPath = path.join('src', 'schema', 'index.ts');
        await formatAndLint([schemaPath, resolverPath, indexPath, testPath, schemaIndexPath, 'codegen.ts']);

        console.log(`\nCreated:\n- ${schemaPath}\n- ${resolverPath}\n- ${indexPath}\n- ${testPath}`);
        console.log(`Integrated into src/schema/index.ts (imports, typeDefs, resolvers).`);
        console.log(`Updated codegen mappers for ${typeName} in codegen.ts.`);
        console.log('\nOptional next step:\n- Run `pnpm codegen` to refresh TS types.');
    } finally {
        rl.close();
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
