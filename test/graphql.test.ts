import { TEST_DIFF_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from './helper'
import { CompareOptions } from '../src/types'
import { apiDiff } from '../src'
import { buildSchema } from 'graphql'
import { buildFromSchema } from '@netcracker/qubership-apihub-graphapi'
import { readFileSync } from 'fs'

const OPTIONS = {
    unify: true,
    validate: true,
    liftCombiners: true,
    syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
    metaKey: TEST_DIFF_FLAG,
} satisfies CompareOptions

const DIFFS_AGGREGATED = Symbol('$diffs-aggregated')

function splitSourceToComponents(source: any) {
    const { components, ...rest } = source
    return rest
}

function countObjects(obj: any, visited: Set<any>, currentDepth: number = 0, maxDepth: { value: number } = { value: 0 }): number {
    if (obj === null || typeof obj !== 'object') {
        return 0
    }

    if (visited.has(obj)) {
        return 0
    }

    visited.add(obj)
    maxDepth.value = Math.max(maxDepth.value, currentDepth)
    let count = 1 // Count the current object

    if (Array.isArray(obj)) {
        for (const item of obj) {
            count += countObjects(item, visited, currentDepth + 1, maxDepth)
        }
    } else {
        for (const value of Object.values(obj)) {
            count += countObjects(value, visited, currentDepth + 1, maxDepth)
        }
    }

    return count
}

function aggregateDiffs(obj: any, visited = new Set<any>()): Set<any> {
    if (obj === null || typeof obj !== 'object' || visited.has(obj)) {
        return new Set()
    }
    
    visited.add(obj)
    const aggregatedDiffs = new Set<any>()
    
    // Process all children and collect their diffs
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const childDiffs = aggregateDiffs(item, visited)
            childDiffs.forEach(diff => aggregatedDiffs.add(diff))
        }
    } else {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
                const childDiffs = aggregateDiffs(value, visited)
                childDiffs.forEach(diff => aggregatedDiffs.add(diff))
            }
        }
    }
    
    // Add own diffs if present
    if (TEST_DIFF_FLAG in obj) {
        const diffs = obj[TEST_DIFF_FLAG]
        for (const key in diffs) {
            aggregatedDiffs.add(diffs[key])
        }
    }
    
    // Store the aggregated diffs in the object
    obj[DIFFS_AGGREGATED] = aggregatedDiffs
    
    return aggregatedDiffs
}

function testGraphQLDiff(beforeFile: string, afterFile: string, expectedDiffCount: number) {
    const beforeSource = buildFromSchema(buildSchema(readFileSync(beforeFile).toString(), { noLocation: true }))
    const afterSource = buildFromSchema(buildSchema(readFileSync(afterFile).toString(), { noLocation: true }))
    const before: unknown = splitSourceToComponents(beforeSource)
    const after: unknown = splitSourceToComponents(afterSource)
    
    console.time('apiDiff')
    const result = apiDiff(before, after, {
        ...OPTIONS,
        beforeSource,
        afterSource,
    })
    console.timeEnd('apiDiff')
    
    console.time('countObjects')
    const visited = new Set()
    const maxDepth = { value: 0 }
    const objectCount = countObjects(result.merged, visited, 0, maxDepth)
    console.timeEnd('countObjects')
    console.log(`Total objects in result: ${objectCount}`)
    console.log(`Unique objects visited: ${visited.size}`)
    console.log(`Maximum recursion depth: ${maxDepth.value}`)
    
    // Aggregate diffs
    console.time('aggregateDiffs')
    const allDiffs = aggregateDiffs(result.merged)
    console.timeEnd('aggregateDiffs')
    console.log(`Total aggregated diffs: ${allDiffs.size}`)
    
    // expect(result.diffs.length).toEqual(expectedDiffCount)
}

describe('Real Data', () => {
    it('Graph QL Simple', () => {
        testGraphQLDiff(
            './test/helper/resources/graphql/simple/before.graphql',
            './test/helper/resources/graphql/simple/after.graphql',
            1
        )
    })

    it('Graph QL Large x8', () => {
        testGraphQLDiff(
            './test/helper/resources/graphql/x8/qgl_large_x8_before.graphql',
            './test/helper/resources/graphql/x8/qgl_large_x8_after.graphql',
            1
        )
    })

    it('Graph QL Shopify 2022-01 -> 2022-04', () => {
        testGraphQLDiff(
            './test/helper/resources/graphql/shopify/Shopify_GraphQL_2022_01.graphql',
            './test/helper/resources/graphql/shopify/Shopify_GraphQL_2022_04.graphql',
            1
        )
    })

    it('Graph QL Shopify 2022-04 -> 2023-07', () => {
        testGraphQLDiff(
            './test/helper/resources/graphql/shopify/Shopify_GraphQL_2022_04.graphql',
            './test/helper/resources/graphql/shopify/Shopify_GraphQL_2023_07.graphql',
            1
        )
    })

    it('Graph QL Shopify 2023-07 -> 2023-10', () => {
        testGraphQLDiff(
            './test/helper/resources/graphql/shopify/Shopify_GraphQL_2023_07.graphql',
            './test/helper/resources/graphql/shopify/Shopify_GraphQL_2023_10.graphql',
            1
        )
    })    
})
