import { createTestClient, type TestGraphQLClient } from '../../../mocks/client.js';

describe('busResolvers', () => {
    let client: TestGraphQLClient;

    beforeEach(() => {
        client = createTestClient();
    });

    describe('Bus.placeholder', () => {
        it('resolves', async () => {
            console.log('TODO: implement busResolvers tests', client);
            return; // TODO
        });
    });
});
