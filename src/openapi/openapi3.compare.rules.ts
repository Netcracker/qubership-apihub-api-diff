import { allUnclassified } from '../core'
import { CompareRules } from '../types'

export const openApiSpecificationExtensionRules = {
  '/^': {
    'x-': {
      $: allUnclassified,
      '/**': {
        $: allUnclassified,
      },
    },
  }
} as CompareRules
