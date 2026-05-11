/**
 * UK Capital Gains Tax (CGT) 计算引擎
 *
 * 实现 HMRC 规定的股票匹配规则,用于计算资本利得税。
 *
 * ===== HMRC 三大匹配规则(按优先级从高到低)=====
 *
 * 规则 1: Same Day Rule — 同日买卖必须优先配对
 * 规则 2: 30-Day Rule (Bed & Breakfast) — 卖出后 30 天内重新买回必须配对 (FIFO)
 * 规则 3: Section 104 Pool — 剩余股份按平均成本池化
 *
 * ===== Per-Security 规则 =====
 *
 * HMRC 要求"同公司同类证券"才能合并成一个 S104 池。
 * 本计算器以 ticker(证券代码)作为"同一只股票"的判定 — 同 ticker = 同 pool,
 * 不同 ticker = 各自独立的 pool。年免税额作用于"总利得",不按股票分摊。
 *
 * ===== Section 104 池的语义 =====
 *
 * 池是"汇总后失去个体身份"的持有单元 — 多笔买入按时序进池后,
 * 池本身只有 {shares, totalCost} 两个状态。卖出消耗池子时,
 * 按 (totalCost / shares) 平均成本计算,且消耗后池子的平均成本不变
 * (因为是按比例扣减)。
 *
 * 因此池状态必须跨多笔销售持久化,不能从原始买入列表反复重建 ——
 * 否则前一笔销售对池子的消耗会丢失。
 */

import { differenceInCalendarDays, parseISO } from 'date-fns'
import type {
  Transaction,
  MatchResult,
  MatchDetail,
  DisposalDetail,
  Section104Pool,
  TickerResult,
  CGTResult,
  TaxpayerType,
} from './types'
import { CGT_ANNUAL_EXEMPTION, CGT_RATES } from './tax-constants'

/** 卖出分配追踪器 */
interface SaleAllocation {
  saleId: string
  saleDate: string
  salePricePerShare: number
  totalSaleShares: number
  remainingShares: number
}

/** 买入分配追踪器 */
interface BuyAllocation {
  buyId: string
  buyDate: string
  buyPricePerShare: number
  totalBuyShares: number
  remainingShares: number
}

// ===== 工具函数 =====

const round2 = (n: number) => Math.round(n * 100) / 100

/** 从 MatchDetail 生成向后兼容的 MatchResult 描述字符串 */
function descriptionFromDetail(d: MatchDetail): string {
  if (d.rule === 'same-day') {
    return `Same Day: ${d.sharesMatched} shares sold, matched with buy @ £${d.matchedBuyPricePerShare!.toFixed(2)}`
  }
  if (d.rule === '30-day') {
    return `30-Day Rule: ${d.sharesMatched} shares matched with buy ${d.daysDifference} days later @ £${d.matchedBuyPricePerShare!.toFixed(2)}`
  }
  return `Section 104 Pool: ${d.sharesMatched} shares @ avg cost £${d.poolAvgCostPerShare!.toFixed(2)}`
}

// ===== 主入口 =====

export function processTransactions(
  transactions: Transaction[],
  taxpayerType: TaxpayerType
): CGTResult {
  if (transactions.length === 0) {
    return emptyResult(taxpayerType)
  }

  // 第一步:按 ticker 分组(HMRC per-security 规则)
  const byTickerMap = new Map<string, Transaction[]>()
  for (const t of transactions) {
    const key = t.ticker.trim().toUpperCase()
    if (!byTickerMap.has(key)) byTickerMap.set(key, [])
    byTickerMap.get(key)!.push(t)
  }

  // 第二步:逐 ticker 跑独立的 S104 池 + 三规则匹配
  const tickerKeys = Array.from(byTickerMap.keys()).sort()
  const byTicker: TickerResult[] = tickerKeys.map(ticker => {
    const txs = byTickerMap.get(ticker)!
    return processSingleTicker(ticker, txs)
  })

  // 第三步:平铺所有 disposals(按销售日全局排序,便于审计底稿浏览)
  const disposals: DisposalDetail[] = byTicker
    .flatMap(tr => tr.disposals)
    .sort((a, b) => {
      if (a.saleDate !== b.saleDate) return a.saleDate.localeCompare(b.saleDate)
      return a.ticker.localeCompare(b.ticker)
    })
    .map((d, i) => ({ ...d, disposalNumber: i + 1 }))

  // 第四步:向后兼容的 matches 平铺(单 ticker 场景下仍可用)
  const matches: MatchResult[] = disposals.flatMap(d =>
    d.matches.map(m => ({
      rule: m.rule,
      saleId: d.saleId,
      sharesMatched: m.sharesMatched,
      proceeds: m.proceeds,
      cost: m.cost,
      gain: m.gain,
      description: descriptionFromDetail(m),
    }))
  )

  // 第五步:全局汇总 — 年免税额作用于「总利得」,不分股票
  const totalGain = byTicker.reduce((sum, tr) => sum + tr.totalGain, 0)
  const totalProceeds = byTicker.reduce((sum, tr) => sum + tr.totalProceeds, 0)
  const totalCost = byTicker.reduce((sum, tr) => sum + tr.totalCost, 0)

  const taxableGain = Math.max(0, totalGain - CGT_ANNUAL_EXEMPTION)
  const taxRate = CGT_RATES[taxpayerType]
  const taxDue = round2(taxableGain * taxRate)

  return {
    disposals,
    byTicker,
    matches,
    numberOfDisposals: disposals.length,
    totalGain: round2(totalGain),
    totalProceeds: round2(totalProceeds),
    totalCost: round2(totalCost),
    annualExemption: CGT_ANNUAL_EXEMPTION,
    taxableGain: round2(taxableGain),
    taxRate,
    taxDue,
  }
}

// ===== Per-Ticker 计算管道 =====

/**
 * 对单一 ticker 的交易跑完整的三规则匹配流程,产 per-stock 结果。
 *
 * 池跨当前 ticker 内的所有销售持久化,但不会跟其他 ticker 共享。
 */
function processSingleTicker(
  ticker: string,
  transactions: Transaction[]
): TickerResult {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))

  const buyAllocations: BuyAllocation[] = sorted
    .filter(t => t.type === 'buy')
    .map(t => ({
      buyId: t.id,
      buyDate: t.date,
      buyPricePerShare: t.pricePerShare,
      totalBuyShares: t.shares,
      remainingShares: t.shares,
    }))

  const saleAllocations: SaleAllocation[] = sorted
    .filter(t => t.type === 'sell')
    .map(t => ({
      saleId: t.id,
      saleDate: t.date,
      salePricePerShare: t.pricePerShare,
      totalSaleShares: t.shares,
      remainingShares: t.shares,
    }))

  // 持久化的 Section 104 池 — 跨当前 ticker 的所有销售保持状态
  const pool: Section104Pool = { shares: 0, totalCost: 0 }
  // 已加入池的买入 ID(避免重复入池)
  const pooledBuyIds = new Set<string>()

  const disposals: DisposalDetail[] = []

  // 对每笔卖出,按优先级依次应用三条规则
  for (let i = 0; i < saleAllocations.length; i++) {
    const sale = saleAllocations[i]

    // 规则 1: 同日规则(优先消耗同日买入)
    const sameDayMatches = applySameDayRule(sale, buyAllocations)

    // 规则 2: 30 天规则(消耗销售后 30 天内的买入,FIFO)
    const thirtyDayMatches = apply30DayRule(sale, buyAllocations)

    // 将所有「销售日之前」尚未入池的买入加入池
    // (它们的 remainingShares 已经反映了上述规则的消耗)
    for (const buy of buyAllocations) {
      if (
        buy.buyDate < sale.saleDate &&
        !pooledBuyIds.has(buy.buyId) &&
        buy.remainingShares > 0
      ) {
        pool.shares += buy.remainingShares
        pool.totalCost += buy.remainingShares * buy.buyPricePerShare
        pooledBuyIds.add(buy.buyId)
      }
    }

    // 规则 3: Section 104 池(消耗持久化的 pool 状态)
    let poolMatch: MatchDetail | null = null
    if (sale.remainingShares > 0 && pool.shares > 0) {
      poolMatch = applySection104(sale, pool)
    }

    // 同日买入若有剩余(同日买 100 但同日只卖 50),剩余进池
    for (const buy of buyAllocations) {
      if (
        buy.buyDate === sale.saleDate &&
        !pooledBuyIds.has(buy.buyId) &&
        buy.remainingShares > 0
      ) {
        pool.shares += buy.remainingShares
        pool.totalCost += buy.remainingShares * buy.buyPricePerShare
        pooledBuyIds.add(buy.buyId)
      }
    }

    const allMatches = [
      ...sameDayMatches,
      ...thirtyDayMatches,
      ...(poolMatch ? [poolMatch] : []),
    ]

    disposals.push({
      disposalNumber: i + 1, // 临时,由 processTransactions 重新编号
      ticker,
      saleId: sale.saleId,
      saleDate: sale.saleDate,
      sharesDisposed: sale.totalSaleShares,
      pricePerShare: sale.salePricePerShare,
      totalProceeds: round2(sale.totalSaleShares * sale.salePricePerShare),
      matches: allMatches,
      totalCost: round2(allMatches.reduce((s, m) => s + m.cost, 0)),
      totalGain: round2(allMatches.reduce((s, m) => s + m.gain, 0)),
      poolAfter: {
        shares: pool.shares,
        totalCost: round2(pool.totalCost),
      },
    })
  }

  // 最终池 = 持久化池 + 所有还没入池且有剩余的买入
  // (覆盖最后一笔销售之后才发生的、且 30 天规则未消耗完的买入)
  for (const buy of buyAllocations) {
    if (!pooledBuyIds.has(buy.buyId) && buy.remainingShares > 0) {
      pool.shares += buy.remainingShares
      pool.totalCost += buy.remainingShares * buy.buyPricePerShare
      pooledBuyIds.add(buy.buyId)
    }
  }

  const finalPool: Section104Pool = {
    shares: pool.shares,
    totalCost: round2(pool.totalCost),
  }

  // Per-ticker 汇总
  const totalProceeds = disposals.reduce((s, d) => s + d.totalProceeds, 0)
  const totalCost = disposals.reduce((s, d) => s + d.totalCost, 0)
  const totalGain = disposals.reduce((s, d) => s + d.totalGain, 0)

  return {
    ticker,
    disposals,
    section104Pool: finalPool,
    totalProceeds: round2(totalProceeds),
    totalCost: round2(totalCost),
    totalGain: round2(totalGain),
  }
}

// ===== 规则 1: 同日规则 =====

function applySameDayRule(
  sale: SaleAllocation,
  buyAllocations: BuyAllocation[]
): MatchDetail[] {
  const details: MatchDetail[] = []

  const sameDayBuys = buyAllocations.filter(
    b => b.buyDate === sale.saleDate && b.remainingShares > 0
  )

  for (const buy of sameDayBuys) {
    if (sale.remainingShares <= 0) break

    const sharesToMatch = Math.min(sale.remainingShares, buy.remainingShares)
    const proceeds = sharesToMatch * sale.salePricePerShare
    const cost = sharesToMatch * buy.buyPricePerShare
    const gain = proceeds - cost

    details.push({
      rule: 'same-day',
      sharesMatched: sharesToMatch,
      proceeds: round2(proceeds),
      cost: round2(cost),
      gain: round2(gain),
      matchedBuyDate: buy.buyDate,
      matchedBuyPricePerShare: buy.buyPricePerShare,
      daysDifference: 0,
      poolAvgCostPerShare: null,
    })

    sale.remainingShares -= sharesToMatch
    buy.remainingShares -= sharesToMatch
  }

  return details
}

// ===== 规则 2: 30 天规则 =====

function apply30DayRule(
  sale: SaleAllocation,
  buyAllocations: BuyAllocation[]
): MatchDetail[] {
  const details: MatchDetail[] = []

  if (sale.remainingShares <= 0) return details

  const saleDate = parseISO(sale.saleDate)

  const eligibleBuys = buyAllocations
    .filter(b => {
      const buyDate = parseISO(b.buyDate)
      const daysDiff = differenceInCalendarDays(buyDate, saleDate)
      return daysDiff > 0 && daysDiff <= 30 && b.remainingShares > 0
    })
    .sort((a, b) => a.buyDate.localeCompare(b.buyDate))

  for (const buy of eligibleBuys) {
    if (sale.remainingShares <= 0) break

    const sharesToMatch = Math.min(sale.remainingShares, buy.remainingShares)
    const proceeds = sharesToMatch * sale.salePricePerShare
    const cost = sharesToMatch * buy.buyPricePerShare
    const gain = proceeds - cost
    const daysDiff = differenceInCalendarDays(parseISO(buy.buyDate), saleDate)

    details.push({
      rule: '30-day',
      sharesMatched: sharesToMatch,
      proceeds: round2(proceeds),
      cost: round2(cost),
      gain: round2(gain),
      matchedBuyDate: buy.buyDate,
      matchedBuyPricePerShare: buy.buyPricePerShare,
      daysDifference: daysDiff,
      poolAvgCostPerShare: null,
    })

    sale.remainingShares -= sharesToMatch
    buy.remainingShares -= sharesToMatch
  }

  return details
}

// ===== 规则 3: Section 104 =====

function applySection104(
  sale: SaleAllocation,
  pool: Section104Pool
): MatchDetail | null {
  if (sale.remainingShares <= 0 || pool.shares <= 0) return null

  const sharesToMatch = Math.min(sale.remainingShares, pool.shares)
  const avgCostPerShare = pool.totalCost / pool.shares
  const proceeds = sharesToMatch * sale.salePricePerShare
  const cost = sharesToMatch * avgCostPerShare
  const gain = proceeds - cost

  // 持久化扣减池子(避免下一笔销售错误地从原始买入重建池)
  pool.totalCost -= sharesToMatch * avgCostPerShare
  pool.shares -= sharesToMatch
  sale.remainingShares -= sharesToMatch

  return {
    rule: 'section-104',
    sharesMatched: sharesToMatch,
    proceeds: round2(proceeds),
    cost: round2(cost),
    gain: round2(gain),
    matchedBuyDate: null,
    matchedBuyPricePerShare: null,
    daysDifference: null,
    poolAvgCostPerShare: round2(avgCostPerShare),
  }
}

// ===== 空结果 =====

function emptyResult(taxpayerType: TaxpayerType): CGTResult {
  return {
    disposals: [],
    byTicker: [],
    matches: [],
    numberOfDisposals: 0,
    totalGain: 0,
    totalProceeds: 0,
    totalCost: 0,
    annualExemption: CGT_ANNUAL_EXEMPTION,
    taxableGain: 0,
    taxRate: CGT_RATES[taxpayerType],
    taxDue: 0,
  }
}
