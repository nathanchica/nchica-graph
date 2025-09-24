/**
 * Builds a URL with the given base URL and query parameters.
 * @param baseUrl - The base URL to use. e.g., 'https://api.example.com/resource'
 * @param params - An optional object containing query parameters. e.g., { key1: 'value1', key2: 'value2' }
 * @returns The constructed URL as a string. e.g., 'https://api.example.com/resource?key1=value1&key2=value2'
 */
export function buildUrl(baseUrl: string, params?: Record<string, string>): string {
    const url = new URL(baseUrl);

    // Add any additional parameters
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
    }

    return url.toString();
}
