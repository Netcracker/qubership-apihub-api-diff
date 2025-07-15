import { allAnnotation } from '../core'
import { CompareRules } from '../types'

export const openApiSpecificationExtensionRules = {
  '/^': {
    'x-': {
      $: allAnnotation,
      '/*': {
        $: allAnnotation,
      },
      '/**': {
        $: allAnnotation,
      },
    },
  }
} as CompareRules
