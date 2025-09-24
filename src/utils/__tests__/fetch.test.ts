import type { Response } from 'node-fetch';

import type { FetchWithUrlParams } from '../fetch.js';

const fetchMock = vi.fn();
vi.mock('node-fetch', () => ({
    __esModule: true,
    default: fetchMock,
}));

const buildUrlMock = vi.fn<(url: string, params?: Record<string, string>) => string>();
vi.mock('../url.js', () => ({
    __esModule: true,
    buildUrl: buildUrlMock,
}));

let fetchWithUrlParams: FetchWithUrlParams;

beforeEach(async () => {
    vi.resetModules();
    fetchMock.mockReset();
    buildUrlMock.mockReset();

    const module = await import('../fetch.js');
    fetchWithUrlParams = module.fetchWithUrlParams;
});

describe('fetchWithUrlParams', () => {
    it('builds the URL with params and forwards request init to fetch', async () => {
        const response = { status: 200 } as unknown as Response;
        const requestInit = { method: 'POST' };

        buildUrlMock.mockReturnValue('https://example.com/with-params');
        fetchMock.mockResolvedValue(response);

        const result = await fetchWithUrlParams({
            url: 'https://example.com/base',
            params: { key: 'value' },
            requestInit,
        });

        expect(buildUrlMock).toHaveBeenCalledTimes(1);
        expect(buildUrlMock).toHaveBeenCalledWith('https://example.com/base', { key: 'value' });
        expect(fetchMock).toHaveBeenCalledWith('https://example.com/with-params', requestInit);
        expect(result).toBe(response);
    });

    it('omits params and request init when not provided', async () => {
        const response = { status: 204 } as unknown as Response;

        buildUrlMock.mockReturnValue('https://example.com/no-params');
        fetchMock.mockResolvedValue(response);

        const result = await fetchWithUrlParams({
            url: 'https://example.com/base',
        });

        expect(buildUrlMock).toHaveBeenCalledWith('https://example.com/base', undefined);
        expect(fetchMock).toHaveBeenCalledWith('https://example.com/no-params', undefined);
        expect(result).toBe(response);
    });
});
