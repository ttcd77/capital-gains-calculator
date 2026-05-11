import type { Transaction } from './types'

export interface ValidationError {
  transactionId: string
  transactionDate: string
  ticker: string
  sellShares: number
  holdingAtTime: number
  shortfall: number
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * 校验每笔卖出当时是否有足够持仓 — 按 ticker 独立计算。
 * 不同 ticker 之间不共享持仓:Tesco 没有的股不能用 Lloyds 的填。
 */
export function validateTransactions(transactions: Transaction[]): ValidationResult {
  // 全局排序;同日买入排在卖出之前(契合 HMRC 同日规则)
  const sorted = [...transactions].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    if (a.type === 'buy' && b.type === 'sell') return -1
    if (a.type === 'sell' && b.type === 'buy') return 1
    return 0
  })

  // Per-ticker 持仓追踪
  const holdings = new Map<string, number>()
  const errors: ValidationError[] = []

  for (const tx of sorted) {
    const key = tx.ticker.trim().toUpperCase()
    const current = holdings.get(key) ?? 0

    if (tx.type === 'buy') {
      holdings.set(key, current + tx.shares)
    } else {
      if (tx.shares > current) {
        errors.push({
          transactionId: tx.id,
          transactionDate: tx.date,
          ticker: tx.ticker,
          sellShares: tx.shares,
          holdingAtTime: current,
          shortfall: tx.shares - current,
        })
      }
      holdings.set(key, current - tx.shares)
    }
  }

  return { valid: errors.length === 0, errors }
}
