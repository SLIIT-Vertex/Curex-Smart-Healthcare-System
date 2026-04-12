import { describe, expect, it } from 'vitest'
import { visitPhaseWhenIssuedDescription } from './visitPhaseWhenIssued'

/**
 * prescription form shows the correct visit-status headline
 * for IN_SESSION vs COMPLETED (what will be stored server-side).
 */
describe('visitPhaseWhenIssuedDescription', () => {
  it('returns In session headline for IN_SESSION', () => {
    const c = visitPhaseWhenIssuedDescription('IN_SESSION')
    expect(c.headline).toMatch(/Visit status:\s*In session/i)
    expect(c.detail.length).toBeGreaterThan(20)
  })

  it('returns Completed headline for COMPLETED', () => {
    const c = visitPhaseWhenIssuedDescription('COMPLETED')
    expect(c.headline).toMatch(/Visit status:\s*Completed/i)
    expect(c.detail.length).toBeGreaterThan(20)
  })
})
