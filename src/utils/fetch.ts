import fetch from 'node-fetch';
import type { RequestInit, Response } from 'node-fetch';

import { buildUrl } from './url.js';

export function fetchWithUrlParams({
    url,
    params,
    requestInit,
}: {
    url: string;
    params?: Record<string, string>;
    requestInit?: RequestInit;
}): Promise<Response> {
    const fullUrl = buildUrl(url, params);
    return fetch(fullUrl, requestInit);
}

export type FetchWithUrlParams = typeof fetchWithUrlParams;
