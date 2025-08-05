import { allAnnotation } from '../core'
import { DIFF_ACTION_TO_ACTION_MAP, DIFF_ACTION_TO_PREPOSITION_MAP, getDeclarationPathsForDiff } from '../core/description'
import { CompareRules, Diff } from '../types'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'


const calculateOasExtensionDiffDescription = (diff: Diff) => {
  const declarationPaths = getDeclarationPathsForDiff(diff)

  if (declarationPaths.length === 0) {
    return ''
  }

  // Process paths to extract extension and remaining parts
  const splitPaths = declarationPaths.map(path => splitPathAtExtension(path))
  
  // Use the first path's extension path (assuming all have the same extension path)
  const extensionPath = splitPaths[0].extensionPath
  const action = DIFF_ACTION_TO_ACTION_MAP[diff.action]
  const preposition = DIFF_ACTION_TO_PREPOSITION_MAP[diff.action]
  
  // Collect all unique remaining paths, filtering out undefined values
  const placePaths = splitPaths
    .map(splitPath => splitPath.remainingPath)
    .filter((path): path is string => path !== undefined)
  
  const place = placePaths.length > 0 ? placePaths.join(', ') : 'root'
  return `[${action}] extension '${extensionPath}' ${preposition} ${place}`  
}

const splitPathAtExtension = (path: JsonPath): { extensionPath: string, remainingPath: string | undefined } => {
  // Find the extension name (starts with 'x-') in the path
  let extensionIndex = -1
  for (let i = 0; i < path.length; i++) {
    const pathElement = path[i]
    if (typeof pathElement === 'string' && pathElement.startsWith('x-')) {
      extensionIndex = i
      break
    }
  }
  
  if (extensionIndex === -1) {
    // No extension found, return the whole path as extension path
    return { extensionPath: path.join('.'), remainingPath: undefined }
  }
  
  // Build extension path: includes extension name and any nested properties after it
  const extensionParts = path.slice(extensionIndex)
  const extensionPath = extensionParts.join('.')
  
  // Build remaining path: everything before the extension name
  const remainingParts = path.slice(0, extensionIndex)
  const remainingPath = remainingParts.length > 0 ? remainingParts.join('.') : undefined
  
  return { extensionPath, remainingPath }
}

export const openApiSpecificationExtensionRules = {
  '/^': {
    'x-': {
      $: allAnnotation,
      description: calculateOasExtensionDiffDescription,
      '/*': {
        $: allAnnotation,
        description: calculateOasExtensionDiffDescription,
      },
      '/**': {
        $: allAnnotation,
        description: calculateOasExtensionDiffDescription,
      },
    },
  }
} as CompareRules
