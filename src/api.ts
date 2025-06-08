import { COMPARE_MODE_DEFAULT, COMPARE_SCOPE_ROOT, CompareEngine, CompareOptions, CompareResult } from './types'
import { compareJsonSchema } from './jsonSchema'
import { compareGraphApi } from './graphapi'
import { compareAsyncApi } from './asyncapi'
import { compareOpenApi } from './openapi'
import {
  createEvaluationCacheService,
  resolveSpec,
  SPEC_TYPE_ASYNCAPI_2,
  SPEC_TYPE_GRAPH_API,
  SPEC_TYPE_JSON_SCHEMA_04,
  SPEC_TYPE_JSON_SCHEMA_06,
  SPEC_TYPE_JSON_SCHEMA_07,
  SPEC_TYPE_OPEN_API_30,
  SPEC_TYPE_OPEN_API_31,
  SpecType,
} from '@netcracker/qubership-apihub-api-unifier'
import { DEFAULT_NORMALIZED_RESULT, DEFAULT_OPTION_DEFAULTS_META_KEY, DEFAULT_OPTION_ORIGINS_META_KEY, DIFF_META_KEY } from './core'
import { serialize, deserialize } from './utils'

export const COMPARE_ENGINES_MAP: Record<SpecType, CompareEngine> = {
  [SPEC_TYPE_JSON_SCHEMA_04]: compareJsonSchema(SPEC_TYPE_JSON_SCHEMA_04),
  [SPEC_TYPE_JSON_SCHEMA_06]: compareJsonSchema(SPEC_TYPE_JSON_SCHEMA_06),
  [SPEC_TYPE_JSON_SCHEMA_07]: compareJsonSchema(SPEC_TYPE_JSON_SCHEMA_07),
  [SPEC_TYPE_OPEN_API_30]: compareOpenApi(SPEC_TYPE_OPEN_API_30),
  [SPEC_TYPE_OPEN_API_31]: compareOpenApi(SPEC_TYPE_OPEN_API_31),
  [SPEC_TYPE_ASYNCAPI_2]: compareAsyncApi,
  [SPEC_TYPE_GRAPH_API]: compareGraphApi,
}

// Wrapper function. Use it!
export function apiDiff(before: unknown, after: unknown, options: CompareOptions = {}): CompareResult {
  const beforeSpec = resolveSpec(before)
  const afterSpec = resolveSpec(after)
  if (beforeSpec.type !== afterSpec.type) {
    throw new Error(`Specification cannot be different. Got ${beforeSpec.type} and ${afterSpec.type}`)
  }
  const engine = COMPARE_ENGINES_MAP[beforeSpec.type]
  
  // Determine the metaKey to use (from options or default)
  const metaKey = options.metaKey || DIFF_META_KEY
  
  // Time diff building
  const diffStartTime = performance.now()
  const result = engine(before, after, {
    mode: COMPARE_MODE_DEFAULT,
    normalizedResult: DEFAULT_NORMALIZED_RESULT,
    metaKey: metaKey,
    defaultsFlag: DEFAULT_OPTION_DEFAULTS_META_KEY,
    originsFlag: DEFAULT_OPTION_ORIGINS_META_KEY,
    compareScope: COMPARE_SCOPE_ROOT,
    mergedJsoCache: createEvaluationCacheService(),
    diffUniquenessCache: createEvaluationCacheService(),
    valueAdaptationCache: createEvaluationCacheService(),
    createdMergedJso: new Set(),
    ...options,
  })
  const diffEndTime = performance.now()

  // Serialize and deserialize the merged document, mapping metaKey to '__diff'
  const symbolToStringMapping = new Map<symbol, string>()
  symbolToStringMapping.set(metaKey, '__diff')
  
  const stringToSymbolMapping = new Map<string, symbol>()
  stringToSymbolMapping.set('__diff', metaKey)
  
  // Time serialization
  const serializeStartTime = performance.now()
  const serialized = serialize(result.merged, symbolToStringMapping)
  const serializeEndTime = performance.now()

  // Time deserialization
  const deserializeStartTime = performance.now()
  const deserializedMerged = deserialize(serialized, stringToSymbolMapping)
  const deserializeEndTime = performance.now()

  // Log all timings in one line
  const diffTime = diffEndTime - diffStartTime
  const serializeTime = serializeEndTime - serializeStartTime
  const deserializeTime = deserializeEndTime - deserializeStartTime
  const totalTime = deserializeEndTime - diffStartTime
  console.log(`ApiDiff timing - Diff: ${diffTime.toFixed(2)}ms, Serialize: ${serializeTime.toFixed(2)}ms, Deserialize: ${deserializeTime.toFixed(2)}ms, Total: ${totalTime.toFixed(2)}ms`)

  return {
    ...result,
    merged: deserializedMerged,
  }
}
