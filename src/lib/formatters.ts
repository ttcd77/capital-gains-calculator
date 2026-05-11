export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * 会计括号写法 — 负数用 (£X) 表示,正数和零不变。
 * ATT/CTA 工作底稿、上市公司财报、税务计算表通用写法。
 * 示例:  1200 → £1,200.00
 *       -1200 → (£1,200.00)
 *           0 → £0.00
 */
export function formatGBPAccounting(amount: number): string {
  if (amount < 0) {
    return `(${formatGBP(Math.abs(amount))})`
  }
  return formatGBP(amount)
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}
