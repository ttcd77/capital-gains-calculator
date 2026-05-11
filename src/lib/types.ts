export type TransactionType = 'buy' | 'sell'
export type TaxpayerType = 'basic' | 'higher'

export interface Transaction {
  id: string
  date: string          // YYYY-MM-DD format
  ticker: string        // 证券代码 — 同一 ticker 视为同一只股票,各自独立的 Section 104 池
  type: TransactionType
  shares: number
  pricePerShare: number // £ per share
}

export interface MatchResult {
  rule: 'same-day' | '30-day' | 'section-104'
  saleId: string
  sharesMatched: number
  proceeds: number
  cost: number
  gain: number
  description: string
}

export interface Section104Pool {
  shares: number
  totalCost: number
}

// 结构化匹配明细 — 替代 description 字符串,供审计底稿使用
export interface MatchDetail {
  rule: 'same-day' | '30-day' | 'section-104'
  sharesMatched: number
  proceeds: number
  cost: number
  gain: number
  // 匹配的买入信息(S104 时为 null)
  matchedBuyDate: string | null
  matchedBuyPricePerShare: number | null
  daysDifference: number | null
  // S104 信息(非 S104 时为 null)
  poolAvgCostPerShare: number | null
}

// 单笔处置明细 — 审计底稿的核心单元
export interface DisposalDetail {
  disposalNumber: number
  ticker: string         // 这笔处置属于哪只股票
  saleId: string
  saleDate: string
  sharesDisposed: number
  pricePerShare: number
  totalProceeds: number
  matches: MatchDetail[]
  totalCost: number
  totalGain: number
  poolAfter: Section104Pool
}

// 单只股票的计算结果 — HMRC 池子是按 per-security 建的
export interface TickerResult {
  ticker: string
  disposals: DisposalDetail[]
  section104Pool: Section104Pool
  totalProceeds: number
  totalCost: number
  totalGain: number
}

export interface CGTResult {
  // 全部处置(平铺,按日期排序) — 供 disposal working paper 整体浏览
  disposals: DisposalDetail[]
  // 按 ticker 分组 — 供前端分段展示池子和底稿
  byTicker: TickerResult[]

  // 顶层汇总(用于税额计算 — 年免税额对总利得使用,不分股票)
  numberOfDisposals: number
  totalGain: number
  totalProceeds: number
  totalCost: number
  annualExemption: number
  taxableGain: number
  taxRate: number
  taxDue: number

  // 向后兼容(matches 平铺 + 单一池 — 单 ticker 场景下保留)
  matches: MatchResult[]
}
