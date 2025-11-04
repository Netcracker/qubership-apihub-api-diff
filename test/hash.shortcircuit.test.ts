import { apiDiff } from '../src'
import { normalize } from '@netcracker/qubership-apihub-api-unifier'
import { TEST_DEFAULTS_FLAG, TEST_ORIGINS_FLAG } from './helper'
import 'jest-extended'
import * as mappingModule from '../src/core/mapping'

const TEST_HASH_PROPERTY = Symbol('test-hash')

describe('Hash-based comparison short-circuit', () => {
  it('should skip deep comparison when hashes match', () => {
    const sharedSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        nested: {
          type: 'object',
          properties: {
            deep: { type: 'string' },
            veryDeep: {
              type: 'object',
              properties: {
                level3: { type: 'number' },
              },
            },
          },
        },
      },
    }

    const before = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/unchanged': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: sharedSchema,
                  },
                },
              },
            },
          },
        },
        '/changed': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }

    const after = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/unchanged': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: sharedSchema, // Same reference, will have same hash
                  },
                },
              },
            },
          },
        },
        '/changed': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' }, // Added property
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }

    // Spy on the mapping resolver to verify it's not called for objects with matching hashes
    const objectMappingSpy = jest.spyOn(mappingModule, 'objectMappingResolver')

    // Run comparison WITH hash property
    apiDiff(before, after, {
      hashProperty: TEST_HASH_PROPERTY,
      originsFlag: TEST_ORIGINS_FLAG,
      normalizedResult: true,
    })

    const callsWithHash = objectMappingSpy.mock.calls.length

    // Clear the spy
    objectMappingSpy.mockClear()

    // Run comparison WITHOUT hash property (to establish baseline)
    apiDiff(before, after, {
      // No hashProperty here
      originsFlag: TEST_ORIGINS_FLAG,
      normalizedResult: true,
    })

    const callsWithoutHash = objectMappingSpy.mock.calls.length

    // With hash optimization, there should be fewer calls to objectMappingResolver
    // because the identical nested schema should be short-circuited
    expect(callsWithHash).toBeLessThan(callsWithoutHash)

    objectMappingSpy.mockRestore()
  })
})

