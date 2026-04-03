import { ActionType, ApiCompatibilityKind, CompareScope, Diff, DiffClassifier, DiffClassifierResult, DiffType } from '../types'

/** Use this as `classifyRuleId` in a matching rule to match any ruleId. */
export const WILDCARD_CLASSIFY_RULE_ID = '*'

export type MatchingRuleMatch = {
  /**
   * The classifyRuleId to match. Use WILDCARD_CLASSIFY_RULE_ID ('*') to match any
   * classifyRuleId. Wildcard rules are collected into a separate list and
   * applied after all specific rules have been processed.
   */
  classifyRuleId: string
  action?: ActionType | ActionType[]
  scope?: CompareScope | CompareScope[]
  /**
   * Matches against the accumulated result type from rules applied so far,
   * falling back to the diff's original type when no preceding rule has
   * matched yet. This lets wildcard rules react to the type set by specific
   * rules rather than only the engine's final diff type.
   */
  type?: DiffType | DiffType[]
  effectiveBwcScope?: ApiCompatibilityKind | ApiCompatibilityKind[]
}

export type MatchingRule = {
  match: MatchingRuleMatch
  set: { type: DiffType }
}

function matchesValue<T>(value: T | undefined, filter: T | T[]): boolean {
  return Array.isArray(filter) ? filter.includes(value as T) : value === filter
}

function ruleApplies(diff: Diff, match: MatchingRuleMatch, currentType?: DiffType): boolean {
  if (match.action !== undefined && !matchesValue(diff.action as ActionType, match.action)) {
    return false
  }
  if (match.scope !== undefined && !matchesValue(diff.scope, match.scope)) {
    return false
  }
  if (match.type !== undefined && !matchesValue(currentType ?? diff.type, match.type)) {
    return false
  }
  if (
    match.effectiveBwcScope !== undefined &&
    !matchesValue(diff.effectiveBwcScope, match.effectiveBwcScope as ApiCompatibilityKind | ApiCompatibilityKind[])
  ) {
    return false
  }
  return true
}

/**
 * Builds a DiffClassifier from an ordered array of matching rules.
 *
 * Rules are grouped by classifyRuleId. Rules whose classifyRuleId is
 * WILDCARD_CLASSIFY_RULE_ID ('*') are collected into a separate wildcard list and
 * applied after all specific rules for the diff's classifyRuleId.
 *
 * Rules are applied in direct (array) order; the LAST matching rule wins.
 * Place a more-general rule first and the more-specific (overriding) rule
 * after it so the specific rule takes precedence.
 *
 * The `type` filter checks the accumulated result type from preceding rules,
 * falling back to the diff's original type. This allows wildcard rules to
 * react to the type established by specific rules.
 */
export function matchingDiffClassifier(rules: MatchingRule[]): DiffClassifier {
  const ruleMap = new Map<string, MatchingRule[]>()
  const wildcardRules: MatchingRule[] = []

  for (const rule of rules) {
    const id = rule.match.classifyRuleId
    if (id === WILDCARD_CLASSIFY_RULE_ID) {
      wildcardRules.push(rule)
    } else {
      let group = ruleMap.get(id)
      if (!group) {
        group = []
        ruleMap.set(id, group)
      }
      group.push(rule)
    }
  }

  return (diff: Diff): DiffClassifierResult | undefined => {
    if (!diff.classifyRuleId) {
      return undefined
    }
    const candidates = ruleMap.get(diff.classifyRuleId)
    if (!candidates && wildcardRules.length === 0) {
      return undefined
    }

    let result: DiffClassifierResult | undefined = undefined

    // Specific rules applied in direct order; last match wins.
    for (const candidate of candidates ?? []) {
      if (ruleApplies(diff, candidate.match, result?.type)) {
        result = { type: candidate.set.type }
      }
    }

    // Wildcard rules applied in direct order after all specific rules.
    for (const candidate of wildcardRules) {
      if (ruleApplies(diff, candidate.match, result?.type)) {
        result = { type: candidate.set.type }
      }
    }

    return result
  }
}
