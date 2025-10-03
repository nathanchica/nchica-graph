import { createTestClient, type TestGraphQLClient } from '../../../mocks/client.js';
import { createPositionParent } from '../../root/root.resolver.js';
import { createBusParent } from '../bus.resolver.js';

describe('createBusParent', () => {
    it('creates BusParent with required fields only', () => {
        const bus = createBusParent({ vehicleId: 'V-123' });
        expect(bus).toEqual({
            __typename: 'Bus',
            vehicleId: 'V-123',
        });
    });

    it('creates BusParent with position', () => {
        const position = createPositionParent({ latitude: 37.7749, longitude: -122.4194 });
        const bus = createBusParent({ vehicleId: 'V-999', position });
        expect(bus).toEqual({
            __typename: 'Bus',
            vehicleId: 'V-999',
            position,
        });
    });

    it.each([
        { scenario: 'missing vehicleId', input: {} },
        { scenario: 'empty vehicleId', input: { vehicleId: '' } },
        {
            scenario: 'missing vehicleId but has position',
            input: { position: createPositionParent({ latitude: 1, longitude: 2 }) },
        },
    ])('throws if $scenario', ({ input }) => {
        expect(() => createBusParent(input)).toThrowError(/Bus vehicleId is required to create BusParent/);
    });
});

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
