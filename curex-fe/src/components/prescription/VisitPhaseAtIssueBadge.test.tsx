import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisitPhaseAtIssueBadge } from './VisitPhaseAtIssueBadge'

/**
 * Tests — badges shown on doctor/patient prescription lists.
 */
describe('VisitPhaseAtIssueBadge', () => {
  it('renders “Issued during visit” for IN_SESSION', () => {
    render(<VisitPhaseAtIssueBadge visitStatusAtIssue="IN_SESSION" />)
    expect(screen.getByText('Issued during visit')).toBeInTheDocument()
  })

  it('renders “Issued after visit” for COMPLETED', () => {
    render(<VisitPhaseAtIssueBadge visitStatusAtIssue="COMPLETED" />)
    expect(screen.getByText('Issued after visit')).toBeInTheDocument()
  })

  it('hides legacy rows by default', () => {
    const { container } = render(
      <VisitPhaseAtIssueBadge visitStatusAtIssue={null} legacyMode="hide" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows em dash for legacy when legacyMode is hint', () => {
    render(<VisitPhaseAtIssueBadge visitStatusAtIssue={undefined} legacyMode="hint" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
