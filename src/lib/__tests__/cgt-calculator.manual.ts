/**
 * 手动测试脚本 — 模拟用户使用 CGT 计算器
 *
 * 跑法: npx tsx src/lib/__tests__/cgt-calculator.manual.ts
 *
 * 测 6 个 HMRC 场景:
 *   1. 单纯 Section 104 池(无同日 / 30 天)
 *   2. 同日规则(Same Day)
 *   3. Bed & Breakfast 30 天规则
 *   4. 同日 + 30 天 + Section 104 三规则混合
 *   5. 多笔 Section 104 卖出 — 验证池状态是否正确累减
 *   6. 多 ticker — 每只独立池,顶层汇总
 */

import { processTransactions } from '../cgt-calculator'
import { validateTransactions } from '../validation'
import type { Transaction, CGTResult } from '../types'

let testNum = 0
let passed = 0
let failed = 0

function approx(a: number, b: number, tol = 0.02): boolean {
  return Math.abs(a - b) < tol
}

function tx(date: string, ticker: string, type: 'buy' | 'sell', shares: number, price: number): Transaction {
  return { id: `${ticker}-${date}-${type}-${shares}`, date, ticker, type, shares, pricePerShare: price }
}

interface ExpectedTickerPool {
  ticker: string
  poolShares: number
  poolCost: number
  totalProceeds: number
  totalCost: number
  totalGain: number
}

function runTest(name: string, transactions: Transaction[], expected: {
  totalProceeds: number
  totalCost: number
  totalGain: number
  // 单 ticker 场景(向后兼容旧测试)
  poolShares?: number
  poolCost?: number
  // 多 ticker 场景
  byTicker?: ExpectedTickerPool[]
}) {
  testNum++
  console.log(`\n━━━ Test ${testNum}: ${name} ━━━`)
  console.log('Transactions:')
  transactions.forEach(t => {
    console.log(`  ${t.date} ${t.ticker} ${t.type.toUpperCase()} ${t.shares} @ £${t.pricePerShare}`)
  })

  const v = validateTransactions(transactions)
  if (!v.valid) {
    console.log('VALIDATION FAILED:', v.errors)
    failed++
    return
  }

  const r: CGTResult = processTransactions(transactions, 'higher')

  console.log(`\nResults:`)
  console.log(`  Total proceeds: £${r.totalProceeds.toFixed(2)}  (expected £${expected.totalProceeds.toFixed(2)})`)
  console.log(`  Total cost:     £${r.totalCost.toFixed(2)}  (expected £${expected.totalCost.toFixed(2)})`)
  console.log(`  Total gain:     £${r.totalGain.toFixed(2)}  (expected £${expected.totalGain.toFixed(2)})`)

  const checks: { name: string; ok: boolean }[] = [
    { name: 'proceeds', ok: approx(r.totalProceeds, expected.totalProceeds) },
    { name: 'cost',     ok: approx(r.totalCost, expected.totalCost) },
    { name: 'gain',     ok: approx(r.totalGain, expected.totalGain) },
  ]

  // 单 ticker 旧路径 — 第一只(也是唯一一只)的池
  if (expected.poolShares !== undefined && expected.poolCost !== undefined) {
    const onlyPool = r.byTicker[0]?.section104Pool ?? { shares: 0, totalCost: 0 }
    console.log(`  Pool shares:    ${onlyPool.shares}  (expected ${expected.poolShares})`)
    console.log(`  Pool cost:      £${onlyPool.totalCost.toFixed(2)}  (expected £${expected.poolCost.toFixed(2)})`)
    checks.push({ name: 'pool shares', ok: onlyPool.shares === expected.poolShares })
    checks.push({ name: 'pool cost',   ok: approx(onlyPool.totalCost, expected.poolCost) })
  }

  // 多 ticker 校验 — 每只池子独立验证
  if (expected.byTicker) {
    console.log(`\n  Per-ticker check:`)
    for (const exp of expected.byTicker) {
      const tr = r.byTicker.find(t => t.ticker === exp.ticker)
      if (!tr) {
        console.log(`    [${exp.ticker}] MISSING in result`)
        checks.push({ name: `${exp.ticker} present`, ok: false })
        continue
      }
      console.log(`    [${exp.ticker}] pool ${tr.section104Pool.shares} shares £${tr.section104Pool.totalCost.toFixed(2)} (expected ${exp.poolShares} / £${exp.poolCost.toFixed(2)})`)
      console.log(`             proceeds £${tr.totalProceeds.toFixed(2)} cost £${tr.totalCost.toFixed(2)} gain £${tr.totalGain.toFixed(2)} (expected £${exp.totalProceeds.toFixed(2)} / £${exp.totalCost.toFixed(2)} / £${exp.totalGain.toFixed(2)})`)
      checks.push({ name: `${exp.ticker} pool shares`, ok: tr.section104Pool.shares === exp.poolShares })
      checks.push({ name: `${exp.ticker} pool cost`,   ok: approx(tr.section104Pool.totalCost, exp.poolCost) })
      checks.push({ name: `${exp.ticker} proceeds`,    ok: approx(tr.totalProceeds, exp.totalProceeds) })
      checks.push({ name: `${exp.ticker} cost`,        ok: approx(tr.totalCost, exp.totalCost) })
      checks.push({ name: `${exp.ticker} gain`,        ok: approx(tr.totalGain, exp.totalGain) })
    }
  }

  const allOk = checks.every(c => c.ok)
  if (allOk) {
    console.log('  ✓ PASS')
    passed++
  } else {
    console.log('  ✗ FAIL')
    checks.filter(c => !c.ok).forEach(c => console.log(`    - mismatch: ${c.name}`))
    failed++
  }

  // 打印每笔处置明细
  console.log(`\n  Disposal breakdown:`)
  r.disposals.forEach(d => {
    console.log(`    [${d.ticker}] Sell ${d.sharesDisposed} @ £${d.pricePerShare} on ${d.saleDate} → gain £${d.totalGain.toFixed(2)}`)
    d.matches.forEach(m => {
      const ruleLabel = m.rule === 'same-day' ? 'SameDay' : m.rule === '30-day' ? '30Day' : 'S104'
      console.log(`      [${ruleLabel}] ${m.sharesMatched} shares — proceeds £${m.proceeds.toFixed(2)}, cost £${m.cost.toFixed(2)}, gain £${m.gain.toFixed(2)}`)
    })
    console.log(`      Pool after: ${d.poolAfter.shares} shares, £${d.poolAfter.totalCost.toFixed(2)} cost`)
  })
}

// ─────────────────────────────────────────────────────────
// Test 1: 纯 Section 104 池
// ─────────────────────────────────────────────────────────
runTest('Pure Section 104 — partial sale of pool', [
  tx('2024-01-15', 'TSCO', 'buy',  100, 10),
  tx('2024-05-10', 'TSCO', 'buy',  100, 12),
  tx('2024-09-20', 'TSCO', 'sell', 150, 15),
], {
  totalProceeds: 2250,
  totalCost: 1650,
  totalGain: 600,
  poolShares: 50,
  poolCost: 550,
})

// ─────────────────────────────────────────────────────────
// Test 2: Same Day 同日规则
// ─────────────────────────────────────────────────────────
runTest('Same Day rule + pool overflow', [
  tx('2024-01-15', 'TSCO', 'buy',  100, 10),
  tx('2024-06-10', 'TSCO', 'buy',  50,  20),
  tx('2024-06-10', 'TSCO', 'sell', 75,  25),
], {
  totalProceeds: 1875,
  totalCost: 1250,
  totalGain: 625,
  poolShares: 75,
  poolCost: 750,
})

// ─────────────────────────────────────────────────────────
// Test 3: Bed & Breakfasting (30 天规则)
// ─────────────────────────────────────────────────────────
runTest('30-Day Bed & Breakfast', [
  tx('2024-01-01', 'TSCO', 'buy',  100, 10),
  tx('2024-06-01', 'TSCO', 'sell', 100, 15),
  tx('2024-06-15', 'TSCO', 'buy',  100, 8),
], {
  totalProceeds: 1500,
  totalCost: 800,
  totalGain: 700,
  poolShares: 100,
  poolCost: 1000,
})

// ─────────────────────────────────────────────────────────
// Test 4: 三规则混合
// ─────────────────────────────────────────────────────────
runTest('Same-Day + 30-Day + Section 104 混合', [
  tx('2024-01-01', 'TSCO', 'buy',  100, 10),
  tx('2024-06-10', 'TSCO', 'buy',  100, 15),
  tx('2024-06-10', 'TSCO', 'sell', 200, 20),
  tx('2024-06-25', 'TSCO', 'buy',  30,  18),
], {
  totalProceeds: 4000,
  totalCost: 2740,
  totalGain: 1260,
  poolShares: 30,
  poolCost: 300,
})

// ─────────────────────────────────────────────────────────
// Test 5: 多笔 Section 104 卖出 — 验证池状态是否正确累减
// ─────────────────────────────────────────────────────────
runTest('Multi-sale Section 104 — pool depletion across sales', [
  tx('2024-01-01', 'TSCO', 'buy',  100, 10),
  tx('2024-02-01', 'TSCO', 'buy',  100, 20),
  tx('2024-03-01', 'TSCO', 'sell', 100, 25),
  tx('2024-04-01', 'TSCO', 'sell', 50,  30),
], {
  totalProceeds: 4000,
  totalCost: 2250,
  totalGain: 1750,
  poolShares: 50,
  poolCost: 750,
})

// ─────────────────────────────────────────────────────────
// Test 6: 多 ticker — 每只独立池,顶层汇总
// ─────────────────────────────────────────────────────────
//   TSCO:
//     Buy 100 @ £10 (Jan 1)  → pool 100 @ £1000
//     Buy 100 @ £12 (Mar 1)  → pool 200 @ £2200, avg £11
//     Sell 150 @ £15 (Jun 1) → cost 150×11=£1650, proceeds £2250, gain £600
//     Pool after: 50 @ £550
//
//   LLOY:(完全独立的池子,跟 TSCO 不混)
//     Buy 200 @ £0.50 (Feb 1)  → pool 200 @ £100
//     Buy 200 @ £0.40 (Apr 1)  → pool 400 @ £180, avg £0.45
//     Sell 100 @ £0.60 (Jul 1) → cost 100×0.45=£45, proceeds £60, gain £15
//     Pool after: 300 @ £135
//
//   Aggregated:
//     proceeds = £2250 + £60   = £2310
//     cost     = £1650 + £45   = £1695
//     gain     = £600  + £15   = £615
runTest('Multi-ticker — independent S104 pools, aggregated totals', [
  tx('2024-01-01', 'TSCO', 'buy',  100, 10),
  tx('2024-02-01', 'LLOY', 'buy',  200, 0.50),
  tx('2024-03-01', 'TSCO', 'buy',  100, 12),
  tx('2024-04-01', 'LLOY', 'buy',  200, 0.40),
  tx('2024-06-01', 'TSCO', 'sell', 150, 15),
  tx('2024-07-01', 'LLOY', 'sell', 100, 0.60),
], {
  totalProceeds: 2310,
  totalCost: 1695,
  totalGain: 615,
  byTicker: [
    { ticker: 'LLOY', poolShares: 300, poolCost: 135, totalProceeds: 60,  totalCost: 45,  totalGain: 15 },
    { ticker: 'TSCO', poolShares: 50,  poolCost: 550, totalProceeds: 2250, totalCost: 1650, totalGain: 600 },
  ],
})

// ─────────────────────────────────────────────────────────
// 总结
// ─────────────────────────────────────────────────────────
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`Results: ${passed}/${testNum} passed, ${failed} failed`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
process.exit(failed > 0 ? 1 : 0)
