'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { DisposalDetail, MatchDetail, Section104Pool, TickerResult } from '@/lib/types'
import { formatGBP, formatGBPAccounting, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface DisposalWorkingPaperProps {
  byTicker: TickerResult[]
}

const RULE_LABELS: Record<MatchDetail['rule'], { label: string; weight: 'strong' | 'normal' }> = {
  'same-day':    { label: 'Same Day',    weight: 'strong' },
  '30-day':      { label: '30-Day',      weight: 'normal' },
  'section-104': { label: 'Section 104', weight: 'normal' },
}

export function DisposalWorkingPaper({ byTicker }: DisposalWorkingPaperProps) {
  // 只展示有处置的 ticker — 纯买入(无 sell)不进底稿
  const tickersWithDisposals = byTicker.filter(tr => tr.disposals.length > 0)

  if (tickersWithDisposals.length === 0) {
    return (
      <div className="glass-panel p-12 text-center">
        <p className="text-sm text-[var(--ink-4)]">
          Disposal working paper will appear here after calculation.
        </p>
      </div>
    )
  }

  const totalDisposals = tickersWithDisposals.reduce(
    (s, tr) => s + tr.disposals.length,
    0
  )

  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--hairline)]">
        <h3 className="text-sm font-semibold text-[var(--ink)] tracking-tight">
          Disposal working paper
        </h3>
        <p className="text-[11px] text-[var(--ink-4)] mt-0.5">
          {totalDisposals} sell{totalDisposals === 1 ? '' : 's'} across {tickersWithDisposals.length} securit{tickersWithDisposals.length === 1 ? 'y' : 'ies'} — each pool computed independently per HMRC rules.
        </p>
      </div>

      <div>
        {tickersWithDisposals.map((tr, i) => (
          <TickerSection
            key={tr.ticker}
            tickerResult={tr}
            isLast={i === tickersWithDisposals.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

// ===== 单只股票的处置段 =====

function TickerSection({
  tickerResult,
  isLast,
}: {
  tickerResult: TickerResult
  isLast: boolean
}) {
  const { ticker, disposals, totalProceeds, totalCost, totalGain, section104Pool } = tickerResult
  const isLoss = totalGain < 0

  return (
    <div className={!isLast ? 'border-b-2 border-[var(--hairline-strong)]' : ''}>
      {/* Ticker 段头 — 强分隔 */}
      <div className="px-5 py-3 bg-[rgba(26,28,30,0.025)] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="num text-base font-semibold tracking-wider text-[var(--ink)]">
            {ticker}
          </span>
          <span className="h-px w-6 bg-[var(--hairline-strong)]" />
          <span className="text-[11px] text-[var(--ink-4)]">
            {disposals.length} disposal{disposals.length === 1 ? '' : 's'}
            &nbsp;·&nbsp;independent Section 104 pool
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-[var(--ink-5)]">
            Subtotal gain&nbsp;
            <span className={cn(
              'num font-semibold text-[var(--ink)]',
              isLoss && 'italic'
            )}>
              {formatGBPAccounting(totalGain)}
            </span>
          </span>
        </div>
      </div>

      {/* 该 ticker 的处置行 */}
      <div>
        {disposals.map((disposal, idx) => (
          <DisposalRow
            key={disposal.saleId}
            disposal={disposal}
            isLast={idx === disposals.length - 1}
          />
        ))}
      </div>

      {/* 该 ticker 的小计 + 最终池 */}
      <div className="px-5 py-3 bg-white/25 border-t border-[var(--hairline)] grid grid-cols-1 md:grid-cols-2 gap-3">
        <SubtotalLine
          label={`${ticker} subtotal`}
          proceeds={totalProceeds}
          cost={totalCost}
          gain={totalGain}
        />
        <FinalPoolLine ticker={ticker} pool={section104Pool} />
      </div>
    </div>
  )
}

function SubtotalLine({
  label,
  proceeds,
  cost,
  gain,
}: {
  label: string
  proceeds: number
  cost: number
  gain: number
}) {
  const isLoss = gain < 0
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-5)] font-medium">
        {label}
      </p>
      <div className="text-xs text-[var(--ink-3)] flex flex-wrap gap-x-3">
        <span>Proceeds <span className="num text-[var(--ink-2)] font-medium">{formatGBP(proceeds)}</span></span>
        <span>Cost <span className="num text-[var(--ink-2)] font-medium">{formatGBP(cost)}</span></span>
        <span>
          Gain{' '}
          <span className={cn(
            'num font-semibold text-[var(--ink)]',
            isLoss && 'italic'
          )}>
            {formatGBPAccounting(gain)}
          </span>
        </span>
      </div>
    </div>
  )
}

function FinalPoolLine({
  ticker,
  pool,
}: {
  ticker: string
  pool: Section104Pool
}) {
  const avg = pool.shares > 0 ? pool.totalCost / pool.shares : 0
  return (
    <div className="flex flex-col gap-0.5 md:items-end">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-5)] font-medium">
        {ticker} pool c/f
      </p>
      {pool.shares > 0 ? (
        <div className="text-xs text-[var(--ink-3)] flex flex-wrap gap-x-3">
          <span><span className="num text-[var(--ink-2)] font-medium">{pool.shares.toLocaleString()}</span> shares</span>
          <span><span className="num text-[var(--ink-2)] font-medium">{formatGBP(pool.totalCost)}</span> cost</span>
          <span><span className="num text-[var(--ink-2)] font-medium">{formatGBP(avg)}</span>/share</span>
        </div>
      ) : (
        <p className="text-xs text-[var(--ink-4)] italic">empty — fully disposed</p>
      )}
    </div>
  )
}

// ===== 可展开的处置行 =====

function DisposalRow({
  disposal,
  isLast,
}: {
  disposal: DisposalDetail
  isLast: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isLoss = disposal.totalGain < 0

  // 规则使用次数 — 顶部 chip 用
  const ruleCounts = disposal.matches.reduce((acc, m) => {
    acc[m.rule] = (acc[m.rule] || 0) + 1
    return acc
  }, {} as Record<MatchDetail['rule'], number>)

  return (
    <div className={!isLast ? 'border-b border-[var(--hairline)]' : ''}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/35 transition-colors text-left"
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 text-[var(--ink-5)] shrink-0 transition-transform duration-200',
            isOpen && 'rotate-90 text-[var(--ink-3)]'
          )}
        />

        <span className="ink-pill ink-pill-strong shrink-0">
          SELL
        </span>

        <span className="num text-sm text-[var(--ink-2)] shrink-0 hidden md:inline">
          {formatDate(disposal.saleDate)}
        </span>

        <span className="text-sm text-[var(--ink-3)] shrink-0">
          <span className="num">{disposal.sharesDisposed.toLocaleString()}</span>
          <span className="mx-1">@</span>
          <span className="num">{formatGBP(disposal.pricePerShare)}</span>
        </span>

        <div className="hidden lg:flex items-center gap-1 shrink-0">
          {Object.entries(ruleCounts).map(([rule, count]) => {
            const meta = RULE_LABELS[rule as MatchDetail['rule']]
            return (
              <span
                key={rule}
                className={cn(
                  'ink-pill',
                  meta.weight === 'strong' && 'ink-pill-strong'
                )}
              >
                {meta.label}
                {count > 1 && <span className="ml-1 opacity-60">×{count}</span>}
              </span>
            )
          })}
        </div>

        <span className="flex-1" />

        <span className="num text-sm text-[var(--ink-2)] shrink-0">
          {formatGBP(disposal.totalProceeds)}
        </span>
        <span
          className={cn(
            'num text-sm font-semibold shrink-0 min-w-[120px] text-right text-[var(--ink)]',
            isLoss && 'italic'
          )}
        >
          {formatGBPAccounting(disposal.totalGain)}
        </span>
      </button>

      {isOpen && (
        <div className="bg-white/25 border-t border-[var(--hairline)] px-5 py-5 space-y-6">
          {disposal.matches.map((match, i) => (
            <MatchFormula
              key={i}
              match={match}
              stepNumber={i + 1}
              totalSteps={disposal.matches.length}
              disposal={disposal}
            />
          ))}

          {disposal.matches.length > 1 && (
            <div className="border-t border-[var(--hairline-strong)] pt-4">
              <FormulaLine
                label="Total Gain"
                parts={disposal.matches.map((m) => ({
                  value: formatGBPAccounting(m.gain),
                  annotation: RULE_LABELS[m.rule].label,
                }))}
                operator="+"
                result={formatGBPAccounting(disposal.totalGain)}
                resultLoss={isLoss}
                bold
              />
            </div>
          )}

          <PoolSnapshot ticker={disposal.ticker} pool={disposal.poolAfter} />
        </div>
      )}
    </div>
  )
}

// ===== 单条匹配公式 =====

function MatchFormula({
  match,
  stepNumber,
  totalSteps,
  disposal,
}: {
  match: MatchDetail
  stepNumber: number
  totalSteps: number
  disposal: DisposalDetail
}) {
  const meta = RULE_LABELS[match.rule]
  const isLoss = match.gain < 0

  return (
    <div className="space-y-2.5">
      {/* Rule header — 步骤号 + 规则徽章 + 描述 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="num text-[11px] text-[var(--ink-5)] font-medium w-6 shrink-0">
          {stepNumber}/{totalSteps}
        </span>
        <span
          className={cn(
            'ink-pill',
            meta.weight === 'strong' && 'ink-pill-strong'
          )}
        >
          {meta.label}
        </span>
        {match.rule === 'same-day' && (
          <span className="text-[11px] text-[var(--ink-3)]">
            matched against buy on <span className="num">{formatDate(match.matchedBuyDate!)}</span>
          </span>
        )}
        {match.rule === '30-day' && (
          <span className="text-[11px] text-[var(--ink-3)]">
            matched against buy on <span className="num">{formatDate(match.matchedBuyDate!)}</span>
            &nbsp;(<span className="num">{match.daysDifference}</span> day{match.daysDifference === 1 ? '' : 's'} after sale)
          </span>
        )}
        {match.rule === 'section-104' && (
          <span className="text-[11px] text-[var(--ink-3)]">
            from pool — avg cost <span className="num">{formatGBP(match.poolAvgCostPerShare!)}</span>/share
          </span>
        )}
      </div>

      <div className="ml-7 space-y-2">
        <FormulaLine
          label="Proceeds"
          parts={[
            { value: match.sharesMatched.toLocaleString(), annotation: 'shares' },
            { value: formatGBP(disposal.pricePerShare), annotation: 'sale price' },
          ]}
          operator="×"
          result={formatGBP(match.proceeds)}
        />

        {match.rule !== 'section-104' ? (
          <FormulaLine
            label="Cost"
            parts={[
              { value: match.sharesMatched.toLocaleString(), annotation: 'shares' },
              { value: formatGBP(match.matchedBuyPricePerShare!), annotation: `buy ${formatDate(match.matchedBuyDate!)}` },
            ]}
            operator="×"
            result={formatGBP(match.cost)}
          />
        ) : (
          <FormulaLine
            label="Cost"
            parts={[
              { value: match.sharesMatched.toLocaleString(), annotation: 'shares' },
              { value: formatGBP(match.poolAvgCostPerShare!), annotation: 'pool avg' },
            ]}
            operator="×"
            result={formatGBP(match.cost)}
          />
        )}

        <FormulaLine
          label="Gain"
          parts={[
            { value: formatGBP(match.proceeds), annotation: 'proceeds' },
            { value: formatGBP(match.cost), annotation: 'cost' },
          ]}
          operator="−"
          result={formatGBPAccounting(match.gain)}
          resultLoss={isLoss}
        />
      </div>
    </div>
  )
}

// ===== 公式行 =====

function FormulaLine({
  label,
  parts,
  operator,
  result,
  resultLoss,
  bold,
}: {
  label: string
  parts: { value: string; annotation: string }[]
  operator: string
  result: string
  resultLoss?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex items-end gap-2 text-sm flex-wrap">
      <span className="text-[var(--ink-5)] text-[10px] uppercase tracking-[0.12em] font-medium w-16 shrink-0 text-right pt-3.5">
        {label}
      </span>
      <div className="flex items-end gap-1.5 flex-wrap">
        {parts.map((part, i) => (
          <div key={i} className="flex items-end gap-1.5">
            {i > 0 && (
              <span className="text-[var(--ink-5)] num pb-1.5">{operator}</span>
            )}
            <AnnotatedValue value={part.value} annotation={part.annotation} />
          </div>
        ))}
        <span className="text-[var(--ink-5)] num pb-1.5">=</span>
        <span
          className={cn(
            'num pb-1.5 text-[var(--ink)]',
            bold ? 'text-base font-semibold' : 'font-medium',
            resultLoss && 'italic'
          )}
        >
          {result}
        </span>
      </div>
    </div>
  )
}

function AnnotatedValue({ value, annotation }: { value: string; annotation: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-[var(--ink-5)] leading-tight mb-0.5 whitespace-nowrap">
        {annotation}
      </span>
      <span className="num text-[var(--ink)] glass-chip px-2 py-0.5 text-sm">
        {value}
      </span>
    </div>
  )
}

function PoolSnapshot({ ticker, pool }: { ticker: string; pool: Section104Pool }) {
  const avgCost = pool.shares > 0 ? pool.totalCost / pool.shares : 0
  return (
    <div className="rounded-xl bg-white/30 border border-[var(--hairline)] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-5)] font-medium mb-1.5">
        <span className="num text-[var(--ink-3)] font-semibold tracking-wider">{ticker}</span>
        &nbsp;Section 104 Pool after this disposal
      </p>
      {pool.shares > 0 ? (
        <div className="flex gap-5 text-xs flex-wrap">
          <PoolField label="Shares" value={pool.shares.toLocaleString()} />
          <PoolField label="Cost" value={formatGBP(pool.totalCost)} />
          <PoolField label="Avg / share" value={formatGBP(avgCost)} />
        </div>
      ) : (
        <p className="text-xs text-[var(--ink-4)] italic">empty</p>
      )}
    </div>
  )
}

function PoolField({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[var(--ink-5)]">{label}</span>
      <span className="num text-[var(--ink-2)] font-medium">{value}</span>
    </span>
  )
}
