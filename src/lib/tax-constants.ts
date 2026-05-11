// UK Capital Gains Tax constants for 2024/25 tax year
// Rates effective from 30 October 2024 for shares/securities

export const CGT_ANNUAL_EXEMPTION = 3000 // £3,000 for 2024/25

// CGT rates on shares (post 30 Oct 2024)
export const CGT_RATES = {
  basic: 0.18,   // 18% for basic rate taxpayers
  higher: 0.24,  // 24% for higher/additional rate taxpayers
} as const

export const TAXPAYER_LABELS: Record<string, string> = {
  basic: 'Basic Rate (18%)',
  higher: 'Higher/Additional Rate (24%)',
}
