/**
 * Opens a print-ready prescription document in a new window so the user can
 * print or use the browser’s “Save as PDF” destination.
 */

export type PrescriptionMedicineRowPrint = {
  name: string
  dosage: string
  frequency: string
  duration: string
}

export type PrescriptionLinkedVisitPrint = {
  doctorLine: string
  dateTime: string
  visitType: string
  visitStatus: string
}

export type PrescriptionPrintModel = {
  documentTitle: string
  rxId: string
  issuedAt: string
  statusLabel: string
  patientName: string
  doctorLine: string
  validPeriod: string
  diagnosis: string | null
  instructions: string | null
  medicines: PrescriptionMedicineRowPrint[]
  linkedVisit: PrescriptionLinkedVisitPrint | null
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function nl2brEscaped(text: string): string {
  return escapeHtml(text).split(/\r?\n/).join('<br />')
}

function cellPlain(val: string): string {
  return val.trim()
}

function cellDisplay(val: string): string {
  const t = val.trim()
  return t ? escapeHtml(t) : '—'
}

/** One-line Sig for pharmacy staff (combines dose + schedule + course). */
function buildSigLine(row: PrescriptionMedicineRowPrint): string {
  const dosage = cellPlain(row.dosage)
  const freq = cellPlain(row.frequency)
  const dur = cellPlain(row.duration)
  const parts: string[] = []
  if (dosage) parts.push(dosage)
  if (freq) parts.push(freq)
  if (dur) parts.push(dur)
  if (parts.length === 0) return 'As directed by the prescriber.'
  return parts.join(' · ')
}

function renderLinkedVisit(v: PrescriptionLinkedVisitPrint): string {
  return `<div class="rx-visit" role="note">
    <span class="rx-visit-label">Related consultation</span>
    <span class="rx-visit-body">${escapeHtml(v.dateTime)} · ${escapeHtml(v.visitType)} · ${escapeHtml(v.visitStatus)}</span>
    <span class="rx-visit-sub">${escapeHtml(v.doctorLine)}</span>
  </div>`
}

function renderMedicineBlocks(rows: PrescriptionMedicineRowPrint[]): string {
  if (rows.length === 0) {
    return '<p class="rx-muted rx-empty">No medication lines recorded on this prescription.</p>'
  }
  return rows
    .map((row, i) => {
      const sig = escapeHtml(buildSigLine(row))
      return `<div class="rx-drug">
        <div class="rx-drug-head">
          <span class="rx-drug-num">${i + 1}</span>
          <div class="rx-drug-title">
            <span class="rx-drug-label">Medication</span>
            <span class="rx-drug-name">${cellDisplay(row.name)}</span>
          </div>
        </div>
        <table class="rx-drug-grid" aria-label="Medication ${i + 1} details">
          <tr>
            <th scope="row">Dose / strength</th>
            <td>${cellDisplay(row.dosage)}</td>
            <th scope="row">Frequency</th>
            <td>${cellDisplay(row.frequency)}</td>
          </tr>
          <tr>
            <th scope="row">Duration</th>
            <td colspan="3">${cellDisplay(row.duration)}</td>
          </tr>
          <tr class="rx-sig-row">
            <th scope="row">Sig <span class="rx-th-hint">(directions for use)</span></th>
            <td colspan="3" class="rx-sig">${sig}</td>
          </tr>
        </table>
      </div>`
    })
    .join('')
}

function buildHtmlDocument(model: PrescriptionPrintModel): string {
  const linked = model.linkedVisit ? renderLinkedVisit(model.linkedVisit) : ''
  const diag = model.diagnosis
    ? `<section class="rx-section" aria-labelledby="rx-dx">
        <h2 id="rx-dx" class="rx-h2">Indication / diagnosis</h2>
        <p class="rx-prose">${nl2brEscaped(model.diagnosis)}</p>
      </section>`
    : ''
  const instr = model.instructions
    ? `<section class="rx-section" aria-labelledby="rx-inst">
        <h2 id="rx-inst" class="rx-h2">Additional instructions to patient</h2>
        <p class="rx-prose">${nl2brEscaped(model.instructions)}</p>
      </section>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(model.documentTitle)}</title>
  <style>
    :root {
      color-scheme: light;
      --rx-ink: #14212a;
      --rx-ink-soft: #3d4f5c;
      --rx-border: #1e4d6b;
      --rx-header: #153450;
      --rx-header-deep: #0f2a3d;
      --rx-rule: #c5d4de;
      --rx-fill: #f4f8fb;
      --rx-accent: #1a6b8c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 12px 10px 20px;
      font: 11.5pt/1.5 Georgia, "Times New Roman", Times, serif;
      color: var(--rx-ink);
      background: #e8eef2;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .rx-sheet {
      max-width: 190mm;
      margin: 0 auto;
      background: #fff;
      border: 3px double var(--rx-border);
      box-shadow: 0 1px 4px rgb(0 0 0 / 0.08);
    }
    .rx-header {
      background: linear-gradient(165deg, var(--rx-header) 0%, var(--rx-header-deep) 100%);
      color: #f8fbfd;
      padding: 1rem 1.25rem 1.1rem;
      border-bottom: 4px solid var(--rx-accent);
    }
    .rx-header-top {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 0.75rem 1rem;
    }
    .rx-brand-block {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .rx-brand-k {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      opacity: 0.88;
    }
    .rx-brand-name {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      line-height: 1.15;
      margin-top: 0.15rem;
    }
    .rx-brand-sub {
      font-size: 0.72rem;
      font-weight: 500;
      opacity: 0.88;
      margin-top: 0.2rem;
      max-width: 14rem;
      line-height: 1.35;
    }
    .rx-rx-mark {
      text-align: right;
      font-family: Georgia, serif;
    }
    .rx-rx-symbol {
      font-size: 2.75rem;
      line-height: 0.9;
      font-weight: 400;
      letter-spacing: -0.02em;
    }
    .rx-rx-word {
      display: block;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      margin-top: 0.15rem;
      opacity: 0.92;
    }
    .rx-body {
      padding: 1rem 1.25rem 1.25rem;
    }
    .rx-pair-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem 1.25rem;
      margin-bottom: 0.85rem;
    }
    @media (max-width: 520px) {
      .rx-pair-grid { grid-template-columns: 1fr; }
    }
    .rx-field {
      border: 1px solid var(--rx-rule);
      border-radius: 2px;
      padding: 0.5rem 0.65rem;
      background: var(--rx-fill);
      min-height: 3.1rem;
    }
    .rx-field-label {
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 0.58rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--rx-accent);
      margin-bottom: 0.2rem;
    }
    .rx-field-value {
      font-size: 1.02rem;
      font-weight: 600;
      color: var(--rx-ink);
      line-height: 1.35;
    }
    .rx-field-note {
      font-size: 0.72rem;
      color: var(--rx-ink-soft);
      margin-top: 0.35rem;
      font-weight: 500;
    }
    .rx-meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 0.72rem;
      color: var(--rx-ink-soft);
      border-top: 1px solid var(--rx-rule);
      border-bottom: 1px solid var(--rx-rule);
      padding: 0.45rem 0;
      margin-bottom: 0.85rem;
    }
    .rx-meta-bar strong {
      color: var(--rx-ink);
      font-weight: 700;
    }
    .rx-mono {
      font-family: ui-monospace, "Cascadia Code", monospace;
      font-size: 0.68rem;
      word-break: break-all;
    }
    .rx-visit {
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 0.68rem;
      color: var(--rx-ink-soft);
      background: #fafcfd;
      border: 1px dashed var(--rx-rule);
      padding: 0.45rem 0.6rem;
      margin-bottom: 0.85rem;
      border-radius: 2px;
    }
    .rx-visit-label {
      display: block;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-size: 0.58rem;
      color: var(--rx-accent);
      margin-bottom: 0.2rem;
    }
    .rx-visit-body { display: block; }
    .rx-visit-sub { display: block; margin-top: 0.15rem; opacity: 0.9; }
    .rx-section { margin-bottom: 0.85rem; }
    .rx-h2 {
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 0.58rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--rx-accent);
      margin: 0 0 0.35rem;
      padding-bottom: 0.2rem;
      border-bottom: 1px solid var(--rx-rule);
    }
    .rx-prose {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .rx-med-heading {
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 0.58rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--rx-accent);
      margin: 0 0 0.5rem;
      padding-bottom: 0.2rem;
      border-bottom: 2px solid var(--rx-border);
    }
    .rx-drug {
      border: 1px solid var(--rx-border);
      border-radius: 3px;
      margin-bottom: 0.65rem;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .rx-drug:last-child { margin-bottom: 0; }
    .rx-drug-head {
      display: flex;
      align-items: stretch;
      background: linear-gradient(180deg, #eef5f9 0%, #e2edf4 100%);
      border-bottom: 1px solid var(--rx-rule);
    }
    .rx-drug-num {
      flex: 0 0 2.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-weight: 800;
      font-size: 0.85rem;
      color: #fff;
      background: var(--rx-header);
    }
    .rx-drug-title {
      flex: 1;
      padding: 0.45rem 0.65rem;
    }
    .rx-drug-label {
      display: block;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 0.55rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--rx-ink-soft);
      margin-bottom: 0.1rem;
    }
    .rx-drug-name {
      font-size: 1.08rem;
      font-weight: 700;
      color: var(--rx-ink);
      line-height: 1.3;
    }
    .rx-drug-grid {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    .rx-drug-grid th {
      text-align: left;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-weight: 600;
      color: var(--rx-ink-soft);
      width: 26%;
      padding: 0.35rem 0.6rem;
      border-bottom: 1px solid #e8eef1;
      vertical-align: top;
      background: #fbfdfe;
    }
    .rx-drug-grid td {
      padding: 0.35rem 0.6rem;
      border-bottom: 1px solid #e8eef1;
      vertical-align: top;
      font-weight: 500;
    }
    .rx-drug-grid tr:last-child th,
    .rx-drug-grid tr:last-child td {
      border-bottom: none;
    }
    .rx-th-hint {
      font-weight: 500;
      letter-spacing: 0;
      text-transform: none;
      font-size: 0.65rem;
      opacity: 0.85;
    }
    .rx-sig-row th { vertical-align: middle; }
    .rx-sig {
      font-size: 0.92rem;
      font-weight: 600;
      line-height: 1.4;
      color: var(--rx-ink);
    }
    .rx-muted { color: var(--rx-ink-soft); }
    .rx-empty {
      font-style: italic;
      padding: 0.5rem 0;
      margin: 0;
    }
    .rx-daw {
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 0.72rem;
      color: var(--rx-ink-soft);
      margin: 0.75rem 0 0.65rem;
      padding: 0.45rem 0.55rem;
      border: 1px solid var(--rx-rule);
      border-radius: 2px;
      background: #fafcfd;
    }
    .rx-sign {
      margin-top: 1rem;
      padding-top: 0.65rem;
      border-top: 2px solid var(--rx-ink);
    }
    .rx-sign-line {
      height: 2.25rem;
      border-bottom: 1px solid var(--rx-ink);
      margin-bottom: 0.25rem;
    }
    .rx-sign-cap {
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 0.68rem;
      color: var(--rx-ink-soft);
    }
    .rx-sign-name {
      font-weight: 700;
      color: var(--rx-ink);
    }
    .rx-footer {
      margin-top: 1rem;
      padding-top: 0.65rem;
      border-top: 1px double var(--rx-rule);
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 0.62rem;
      line-height: 1.45;
      color: var(--rx-ink-soft);
    }
    .rx-footer strong { color: var(--rx-ink); }
    @page {
      size: A4;
      margin: 10mm;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .rx-sheet {
        border: 2pt solid #000;
        box-shadow: none;
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <div class="rx-sheet">
    <header class="rx-header">
      <div class="rx-header-top">
        <div class="rx-brand-block">
          <div class="rx-brand-k">Electronic prescription</div>
          <div class="rx-brand-name">Curex</div>
          <div class="rx-brand-sub">Smart Healthcare · Patient-issued copy for dispensing</div>
        </div>
        <div class="rx-rx-mark" aria-hidden="true">
          <div class="rx-rx-symbol">℞</div>
          <span class="rx-rx-word">Prescription</span>
        </div>
      </div>
    </header>

    <div class="rx-body">
      <div class="rx-pair-grid">
        <div class="rx-field">
          <div class="rx-field-label">Patient</div>
          <div class="rx-field-value">${escapeHtml(model.patientName)}</div>
        </div>
        <div class="rx-field">
          <div class="rx-field-label">Prescriber</div>
          <div class="rx-field-value">${escapeHtml(model.doctorLine)}</div>
          <div class="rx-field-note">Prescribing clinician as recorded in Curex</div>
        </div>
      </div>

      <div class="rx-meta-bar">
        <span><strong>Date written</strong> ${escapeHtml(model.issuedAt)}</span>
        <span><strong>Valid for dispensing</strong> ${escapeHtml(model.validPeriod)}</span>
        <span><strong>Prescription status</strong> ${escapeHtml(model.statusLabel)}</span>
        <span><strong>Rx reference</strong> <span class="rx-mono">${escapeHtml(model.rxId)}</span></span>
      </div>

      ${linked}

      <section class="rx-section" aria-labelledby="rx-med">
        <h2 id="rx-med" class="rx-med-heading">Prescribed medications</h2>
        ${renderMedicineBlocks(model.medicines)}
      </section>

      ${diag}
      ${instr}

      <p class="rx-daw">
        <strong>Substitution:</strong> Generic substitution is permitted unless the prescriber has indicated
        “dispense as written” (DAW) in your clinical record. Present this document and your ID at the pharmacy.
      </p>

      <div class="rx-sign">
        <div class="rx-sign-line" aria-hidden="true"></div>
        <p class="rx-sign-cap">
          <span class="rx-sign-name">${escapeHtml(model.doctorLine)}</span>
          — prescriber (electronic issuance via Curex)
        </p>
      </div>

      <footer class="rx-footer">
        <strong>Important:</strong> This copy was generated from the patient portal for your records and for
        pharmacy use where accepted. It is not a substitute for professional medical advice. For questions about
        dosing or interactions, contact the prescriber or your pharmacist. Verify all details against your
        prescription profile before leaving the pharmacy.
      </footer>
    </div>
  </div>
</body>
</html>`
}

/**
 * @returns true if a print window was opened; false if pop-ups are blocked.
 *
 * Note: `window.open(..., 'noopener')` often returns `null` in Chromium while
 * still opening a tab, so `document.write` on the returned handle never runs
 * and users see `about:blank`. A `blob:` URL loads real markup in the new tab.
 */
export function openPrescriptionPrint(model: PrescriptionPrintModel): boolean {
  const html = buildHtmlDocument(model)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  // Omit `noopener` so we get a `Window` when the popup is allowed; otherwise
  // we cannot call `print()` after the document loads.
  const win = window.open(url, '_blank')
  if (!win) {
    URL.revokeObjectURL(url)
    return false
  }

  let urlRevoked = false
  const revokeOnce = () => {
    if (urlRevoked) return
    urlRevoked = true
    URL.revokeObjectURL(url)
  }

  const runPrint = () => {
    win.focus()
    win.print()
    win.addEventListener(
      'afterprint',
      () => {
        revokeOnce()
        win.close()
      },
      { once: true },
    )
    win.addEventListener('pagehide', revokeOnce, { once: true })
  }

  if (win.document.readyState === 'complete') {
    win.setTimeout(runPrint, 0)
  } else {
    win.addEventListener('load', () => win.setTimeout(runPrint, 0), { once: true })
  }

  return true
}
