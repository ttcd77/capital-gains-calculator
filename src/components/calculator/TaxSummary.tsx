'use client'

import type { CGTResult, TickerResult } from '@/lib/types'
import { formatGBP, formatGBPAccounting } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface TaxSummaryProps {
  results: CGTResult
}

export function TaxSummary({ results }: TaxSummaryProps) {
  const isLoss = results.totalGain < 0

  // 仅显示仍持仓的池子(shares > 0),已清仓的不挂在 b/f 区
  const remainingPools = results.byTicker.filter(
    tr => tr.section104Pool.shares > 0
  )

  return (
    <div className="glass-panel p-6 md:p-8 space-y-7">
      {/* Headline */}
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-[var(--ink)] tracking-tight">
          Computation summary
        </h3>
        <span className="text-[11px] text-[var(--ink-5)]">
          {results.numberOfDisposals} disposal{results.numberOfDisposals === 1 ? '' : 's'}
          {results.byTicker.length > 1 && ` · ${results.byTicker.length} securities`}
        </span>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total proceeds"
          value={formatGBP(results.totalProceeds)}
        />
        <MetricCard
          label="Allowable cost"
          value={formatGBP(results.totalCost)}
          sign="−"
        />
        <MetricCard
          label="Net gain / (loss)"
          value={formatGBPAccounting(results.totalGain)}
          emphasis
          accounting={isLoss}
        />
        <MetricCard
          label="Disposals"
          value={String(results.numberOfDisposals)}
        />
      </div>

      {/* Equation row — proceeds − cost = gain */}
      <div className="rounded-2xl bg-white/30 border border-[var(--hairline)] px-5 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <EquationTerm label="Proceeds" value={formatGBP(results.totalProceeds)} />
          <span className="text-[var(--ink-5)] num text-xl">−</span>
          <EquationTerm label="Allowable cost" value={formatGBP(results.totalCost)} />
          <span className="text-[var(--ink-5)] num text-xl">=</span>
          <EquationTerm
            label="Chargeable"
            value={formatGBPAccounting(results.totalGain)}
            emphasis
            accounting={isLoss}
          />
        </div>
      </div>

      {/* Section 104 pools b/f — per security */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-5)] font-medium">
          Section 104 Pools — Remaining holdings (carried forward)
        </p>
        {remainingPools.length > 0 ? (
          <div className="space-y-2">
            {remainingPools.map(tr => (
              <PoolRow key={tr.ticker} tickerResult={tr} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-4)] italic">No shares remaining in any pool.</p>
        )}
      </div>
    </div>
  )
}

// ===== Per-ticker S104 pool row =====

function PoolRow({ tickerResult }: { tickerResult: TickerResult }) {
  const { ticker, section104Pool } = tickerResult
  const avg = section104Pool.shares > 0
    ? section104Pool.totalCost / section104Pool.shares
    : 0

  return (
    <div className="rounded-2xl bg-white/40 border border-[var(--hairline)] px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="num text-sm font-semibold tracking-wider text-[var(--ink)]">
            {ticker}
          </span>
          <span className="h-px w-4 bg-[var(--hairline)]" />
          <span className="text-[11px] text-[var(--ink-5)]">
            Independent Section 104 pool
          </span>
        </div>
        <div className="flex items-center gap-4 text-[12px]">
          <PoolStat label="Shares" value={section104Pool.shares.toLocaleString()} />
          <PoolStat label="Total cost" value={formatGBP(section104Pool.totalCost)} />
          <PoolStat label="Avg / share" value={formatGBP(avg)} />
        </div>
      </div>
    </div>
  )
}

// ===== MetricCard =====

function MetricCard({
  label,
  value,
  emphasis,
  sign,
  accounting,
}: {
  label: string
  value: string
  emphasis?: boolean
  sign?: string
  accounting?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4 border transition',
        emphasis
          ? 'glass-panel-strong border-white/85'
          : 'bg-white/40 border-[var(--hairline)]'
      )}
    >
      <span className="block text-[10px] uppercase tracking-[0.12em] text-[var(--ink-5)] font-medium mb-2">
        {label}
      </span>
      <p
        className={cn(
          'num-display tracking-tight text-[var(--ink)]',
          emphasis ? 'text-2xl md:text-[26px]' : 'text-lg md:text-xl',
          accounting && 'italic'
        )}
      >
        {sign && <span className="text-[var(--ink-5)] mr-1">{sign}</span>}
        {value}
      </p>
    </div>
  )
}

function EquationTerm({
  label,
  value,
  emphasis,
  accounting,
}: {
  label: string
  value: string
  emphasis?: boolean
  accounting?: boolean
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-5)] font-medium">
        {label}
      </span>
      <span
        className={cn(
          'num-display text-[var(--ink)]',
          emphasis ? 'text-xl md:text-[22px]' : 'text-base md:text-lg',
          accounting && 'italic'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function PoolStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-5)] font-medium">
        {label}
      </span>
      <span className="num text-sm font-medium text-[var(--ink)]">{value}</span>
    </span>
  )
}
