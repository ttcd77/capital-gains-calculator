// UK Capital Gains Tax constants — shares / securities
//
// Annual Exempt Amount: £3,000 (unchanged for 2024/25, 2025/26, 2026/27 — HMRC CG10246+)
// Rates on shares: 18% basic / 24% higher, effective from 30 October 2024 onwards
// Source: HMRC CG10245 (rates from 30 October 2024) and gov.uk/capital-gains-tax/rates
//
// Pre-30 Oct 2024 rates were 10% / 20% — for disposals in 2024/25 split across that date,
// the taxpayer identifies pre- and post-30-Oct gains separately. This calculator assumes
// all disposals fall under the post-30-Oct regime.

export const CGT_ANNUAL_EXEMPTION = 3000 // £3,000

export const CGT_RATES = {
  basic: 0.18,   // 18% for basic rate taxpayers
  higher: 0.24,  // 24% for higher / additional rate taxpayers
} as const

export const TAXPAYER_LABELS: Record<string, string> = {
  basic: 'Basic Rate (18%)',
  higher: 'Higher/Additional Rate (24%)',
}
