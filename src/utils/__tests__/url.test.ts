import { buildUrl } from '../url.js';

describe('buildUrl', () => {
    it('returns the base URL unchanged when params are omitted', () => {
        const result = buildUrl('https://example.com/resource');

        expect(result).toBe('https://example.com/resource');
    });

    it('appends new query parameters while preserving existing ones', () => {
        const result = buildUrl('https://example.com/resource?existing=value', {
            extra: 'another',
        });
        const url = new URL(result);

        expect(url.searchParams.get('existing')).toBe('value');
        expect(url.searchParams.get('extra')).toBe('another');
        expect(url.toString()).toBe('https://example.com/resource?existing=value&extra=another');
    });

    it('overrides existing query parameters with provided values', () => {
        const result = buildUrl('https://example.com/resource?override=first', {
            override: 'second',
        });
        const url = new URL(result);

        expect(url.searchParams.getAll('override')).toEqual(['second']);
        expect(url.toString()).toBe('https://example.com/resource?override=second');
    });

    it('properly encodes reserved characters in query parameter values', () => {
        const result = buildUrl('https://example.com/resource', {
            complex: 'value with spaces & symbols/%',
        });

        expect(result).toBe('https://example.com/resource?complex=value+with+spaces+%26+symbols%2F%25');
    });
});
