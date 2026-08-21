function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === '1' || value.toLowerCase() === 'true'
}

/** Release switches keep every milestone independently deployable. */
export const FEATURES = Object.freeze({
  academy: envFlag(import.meta.env.VITE_FEATURE_ACADEMY, true),
  accountSync: envFlag(import.meta.env.VITE_FEATURE_ACCOUNT_SYNC, true),
  dailyAndSprint: envFlag(import.meta.env.VITE_FEATURE_DAILY_SPRINT, true),
  quantumCoherence: envFlag(import.meta.env.VITE_FEATURE_QUANTUM_COHERENCE, true),
  supporterMembership: envFlag(import.meta.env.VITE_FEATURE_SUPPORTER, false),
})
