/** Copy for the issue-prescription form: what will be stored as the visit snapshot. */
export function visitPhaseWhenIssuedDescription(
  status: 'IN_SESSION' | 'COMPLETED',
): { headline: string; detail: string } {
  if (status === 'IN_SESSION') {
    return {
      headline: 'Visit status: In session',
      detail:
        'We will save this prescription as issued while the visit was still in progress. Your patient will see a clear “during visit” label so they know when medicines were started.',
    }
  }
  return {
    headline: 'Visit status: Completed',
    detail:
      'We will save this prescription as issued after the visit was marked complete. Your patient will see an “after visit” label for their records.',
  }
}
