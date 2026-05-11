'use client'

import { useState, useCallback } from 'react'
import { AlertCircle, Calculator, Lock } from 'lucide-react'
import type { Transaction, TaxpayerType, CGTResult } from '@/lib/types'
import { processTransactions } from '@/lib/cgt-calculator'
import { validateTransactions, type ValidationResult } from '@/lib/validation'
import { formatDate } from '@/lib/formatters'
import { TransactionForm } from './TransactionForm'
import { TransactionTable } from './TransactionTable'
import { FileImport } from './FileImport'
import { TaxSummary } from './TaxSummary'
import { DisposalWorkingPaper } from './DisposalWorkingPaper'
import { TaxComputation } from './TaxComputation'
import { cn } from '@/lib/utils'

export function CGTCalculator() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>('basic')
  const [results, setResults] = useState<CGTResult | null>(null)
  const [validationError, setValidationError] = useState<ValidationResult | null>(null)

  const handleAdd = (transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction])
    setResults(null)
    setValidationError(null)
  }

  const handleRemove = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    setResults(null)
    setValidationError(null)
  }

  const handleCalculate = useCallback(() => {
    const sells = transactions.filter((t) => t.type === 'sell')
    if (sells.length === 0) return

    const validation = validateTransactions(transactions)
    if (!validation.valid) {
      setValidationError(validation)
      setResults(null)
      return
    }

    setValidationError(null)
    const result = processTransactions(transactions, taxpayerType)
    setResults(result)
  }, [transactions, taxpayerType])

  const handleImport = (imported: Transaction[]) => {
    setTransactions((prev) => [...prev, ...imported])
    setResults(null)
    setValidationError(null)
  }

  const handleClear = () => {
    setTransactions([])
    setResults(null)
    setValidationError(null)
  }

  const handleTaxpayerTypeChange = useCallback((type: TaxpayerType) => {
    setTaxpayerType(type)
    if (transactions.some((t) => t.type === 'sell')) {
      const validation = validateTransactions(transactions)
      if (validation.valid) {
        const result = processTransactions(transactions, type)
        setResults(result)
      }
    }
  }, [transactions])

  const hasSells = transactions.some((t) => t.type === 'sell')
  const buys = transactions.filter((t) => t.type === 'buy').length
  const sells = transactions.filter((t) => t.type === 'sell').length
  const errorTransactionIds = validationError
    ? new Set(validationError.errors.map((e) => e.transactionId))
    : undefined

  return (
    <div className="space-y-10">

      {/* ─────────── Step 01 — 输入 ─────────── */}
      <section className="space-y-4">
        <SectionHeader step="01" title="Enter transactions" />
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">
          <TransactionForm onAdd={handleAdd} />
          <FileImport onImport={handleImport} />
        </div>
      </section>

      {/* ─────────── Step 02 — 计算(永远显示;无 sell 时按钮 disabled) ─────────── */}
      <section className="space-y-4">
        <SectionHeader
          step="02"
          title="Calculate"
          hint={
            transactions.length === 0
              ? 'Press Calculate once you have buys and at least one sell on the ledger.'
              : hasSells
              ? `${buys} buy${buys === 1 ? '' : 's'} · ${sells} sell${sells === 1 ? '' : 's'} ready to match.`
              : 'Add at least one sell to run matching.'
          }
        />

        <div className="glass-panel px-5 py-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCalculate}
            disabled={!hasSells}
            className="ink-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium"
          >
            <Calculator className="h-3.5 w-3.5" />
            Calculate
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={transactions.length === 0}
            className="ghost-btn inline-flex items-center px-4 py-2.5 text-sm"
          >
            Clear all
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-5 text-xs">
            <Counter label="Buys" value={buys} />
            <span className="text-[var(--ink-6)]">·</span>
            <Counter label="Sells" value={sells} />
          </div>
        </div>
      </section>

      {/* 验证错误 */}
      {validationError && !validationError.valid && (
        <div className="glass-panel border-[var(--ink)]/30 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--ink)] shrink-0" />
            <p className="text-sm font-semibold text-[var(--ink)] tracking-tight">
              Insufficient holdings — cannot calculate
            </p>
          </div>
          {validationError.errors.map((err) => (
            <p key={err.transactionId} className="text-xs text-[var(--ink-3)] ml-6 num leading-relaxed">
              <span className="font-semibold text-[var(--ink)]">{err.ticker}</span>:&nbsp;
              Sell {err.sellShares.toLocaleString()} on {formatDate(err.transactionDate)} exceeds holdings of {err.holdingAtTime.toLocaleString()} (short by {err.shortfall.toLocaleString()}).
            </p>
          ))}
        </div>
      )}

      {/* ─────────── Step 03 — Review(占位 / 实数据切换) ─────────── */}
      <section className="space-y-4">
        <SectionHeader
          step="03"
          title="Review"
          hint={results ? undefined : 'Computation summary will populate here after calculation.'}
          locked={!results}
        />
        {results ? (
          <TaxSummary results={results} />
        ) : (
          <ReviewPlaceholder />
        )}
      </section>

      {/* ─────────── 双栏: 流水台账 + 处置底稿(永远显示) ─────────── */}
      <section className="space-y-4">
        <SectionHeader
          step="—"
          title="Ledger & disposal working paper"
          hint="Chronological transaction list on the left; HMRC rule-by-rule disposal trace on the right."
        />
        <div className="grid gap-5 grid-cols-1 xl:grid-cols-2 xl:items-start">
          <div className={results ? 'xl:sticky xl:top-6' : ''}>
            <TransactionTable
              transactions={transactions}
              onRemove={handleRemove}
              errorTransactionIds={errorTransactionIds}
            />
          </div>
          {results ? (
            <DisposalWorkingPaper byTicker={results.byTicker} />
          ) : (
            <WorkingPaperPlaceholder />
          )}
        </div>
      </section>

      {/* ─────────── Step 04 — Tax(占位 / 实数据切换) ─────────── */}
      <section className="space-y-4">
        <SectionHeader
          step="04"
          title="Tax computation"
          hint={results ? undefined : 'Annual exemption is applied to total gains; the remainder is banded at the rate for your taxpayer status.'}
          locked={!results}
        />
        {results ? (
          <TaxComputation
            results={results}
            taxpayerType={taxpayerType}
            onTaxpayerTypeChange={handleTaxpayerTypeChange}
          />
        ) : (
          <TaxComputationPlaceholder
            taxpayerType={taxpayerType}
            onTaxpayerTypeChange={handleTaxpayerTypeChange}
          />
        )}
      </section>
    </div>
  )
}

// ===== 步骤标题 =====

function SectionHeader({
  step,
  title,
  hint,
  locked,
}: {
  step: string
  title: string
  hint?: string
  locked?: boolean
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="num text-[10px] text-[var(--ink-5)] tracking-[0.18em] font-medium shrink-0">
        {step}
      </span>
      <span className="h-px bg-[var(--hairline)] w-6 shrink-0 self-center" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--ink)] tracking-tight">
            {title}
          </h2>
          {locked && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-5)] font-medium">
              <Lock className="h-2.5 w-2.5" />
              awaiting input
            </span>
          )}
        </div>
        {hint && (
          <p className="text-[11px] text-[var(--ink-4)] mt-0.5">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--ink-5)]">
        {label}
      </span>
      <span className="num text-sm font-semibold text-[var(--ink)]">
        {value}
      </span>
    </span>
  )
}

// ===========================================================================
// 占位骨架 — 在没数据时展示完整流程结构,opacity 调低 + pointer-events-none
// ===========================================================================

const PLACEHOLDER_WRAP = 'glass-panel p-6 md:p-8 space-y-6 opacity-55 select-none pointer-events-none'

function ReviewPlaceholder() {
  return (
    <div className={PLACEHOLDER_WRAP}>
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-[var(--ink-3)] tracking-tight">
          Computation summary
        </h3>
        <span className="text-[11px] text-[var(--ink-5)]">
          — disposals matched
        </span>
      </div>

      {/* 4 个 metric card 骨架 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PlaceholderMetric label="Total proceeds" />
        <PlaceholderMetric label="Allowable cost" sign="−" />
        <PlaceholderMetric label="Net gain / (loss)" emphasis />
        <PlaceholderMetric label="Disposals" />
      </div>

      {/* equation 骨架 */}
      <div className="rounded-2xl bg-white/30 border border-[var(--hairline)] px-5 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <PlaceholderTerm label="Proceeds" />
          <span className="text-[var(--ink-5)] num text-xl">−</span>
          <PlaceholderTerm label="Allowable cost" />
          <span className="text-[var(--ink-5)] num text-xl">=</span>
          <PlaceholderTerm label="Chargeable" emphasis />
        </div>
      </div>

      {/* Pool 骨架 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-5)] font-medium">
          Section 104 Pools — Remaining holdings (carried forward)
        </p>
        <div className="rounded-2xl bg-white/40 border border-[var(--hairline)] px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3 text-[12px]">
            <div className="flex items-center gap-3">
              <span className="num text-sm font-semibold tracking-wider text-[var(--ink-5)]">
                ——
              </span>
              <span className="h-px w-4 bg-[var(--hairline)]" />
              <span className="text-[11px] text-[var(--ink-5)]">
                Independent Section 104 pool per security
              </span>
            </div>
            <div className="flex items-center gap-4">
              <PlaceholderStat label="Shares" />
              <PlaceholderStat label="Total cost" />
              <PlaceholderStat label="Avg / share" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkingPaperPlaceholder() {
  return (
    <div className="glass-panel overflow-hidden opacity-55 select-none pointer-events-none">
      <div className="px-5 py-4 border-b border-[var(--hairline)]">
        <h3 className="text-sm font-semibold text-[var(--ink-3)] tracking-tight">
          Disposal working paper
        </h3>
        <p className="text-[11px] text-[var(--ink-5)] mt-0.5">
          HMRC Same-Day → 30-Day → Section 104 matching breakdown will appear here once calculated.
        </p>
      </div>
      <div>
        {/* 3 行假处置占位 */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn('flex items-center gap-3 px-5 py-3.5', i < 3 && 'border-b border-[var(--hairline-soft)]')}
          >
            <span className="h-4 w-4 shrink-0 text-[var(--ink-6)]">›</span>
            <span className="ink-pill">SELL</span>
            <span className="num text-sm text-[var(--ink-5)]">——</span>
            <span className="text-sm text-[var(--ink-5)]"><span className="num">——</span> @ <span className="num">£——</span></span>
            <div className="hidden lg:flex items-center gap-1">
              <span className="ink-pill">Same Day</span>
              <span className="ink-pill">Section 104</span>
            </div>
            <span className="flex-1" />
            <span className="num text-sm text-[var(--ink-5)]">£——</span>
            <span className="num text-sm font-semibold text-[var(--ink-5)] min-w-[120px] text-right">
              £——
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TaxComputationPlaceholder({
  taxpayerType,
  onTaxpayerTypeChange,
}: {
  taxpayerType: TaxpayerType
  onTaxpayerTypeChange: (type: TaxpayerType) => void
}) {
  // 视觉策略:整体保持 glass-panel 正常清晰度,
  // 占位用 --ink-5 / --ink-6 灰色字色暗示"等待数据",
  // taxpayer band 选择器永远可交互(访客可以提前挑档)
  return (
    <div className="glass-panel p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-3">
          <span className="num text-[10px] text-[var(--ink-5)] tracking-[0.18em] font-medium shrink-0">
            04
          </span>
          <span className="h-px bg-[var(--hairline)] w-6 shrink-0 self-center" />
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-[var(--ink-3)] tracking-tight">
              Tax computation
            </h3>
            <p className="text-[11px] text-[var(--ink-5)] mt-0.5">
              Apply annual exemption, then band the remainder at the appropriate rate.
            </p>
          </div>
        </div>

        <div className="space-y-1.5 min-w-[280px]">
          <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-5)] font-medium">
            Taxpayer band
          </label>
          <div className="glass-input p-0.5 flex">
            <PlaceholderBandBtn
              active={taxpayerType === 'basic'}
              onClick={() => onTaxpayerTypeChange('basic')}
              label="Basic"
              rate="10%"
            />
            <PlaceholderBandBtn
              active={taxpayerType === 'higher'}
              onClick={() => onTaxpayerTypeChange('higher')}
              label="Higher"
              rate="20%"
            />
          </div>
        </div>
      </div>

      {/* Computation flow 骨架 */}
      <div className="rounded-2xl bg-white/30 border border-[var(--hairline)] divide-y divide-[var(--hairline-soft)]">
        <PlaceholderRow label="Net gain / (loss)" />
        <PlaceholderRow label="Annual exemption" sign="−" subdued />
        <PlaceholderRow label="Taxable gain" emphasis />
        <PlaceholderRow label="Tax rate" subdued />
      </div>

      {/* Final tax due 骨架 */}
      <div className="rounded-2xl px-6 py-5 border bg-white/40 border-[var(--hairline-strong)] flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--ink-4)]">
            Capital Gains Tax due
          </p>
          <p className="text-[11px] text-[var(--ink-5)] mt-0.5">
            Calculate transactions above to populate.
          </p>
        </div>
        <p className="num-display text-3xl md:text-[34px] tracking-tight text-[var(--ink-5)]">
          £——
        </p>
      </div>

      <p className="text-[11px] text-[var(--ink-5)] leading-relaxed">
        Estimate for educational purposes only. Not tax advice — consult a qualified adviser for your specific situation.
        Rates and thresholds reflect the 2024 / 25 UK tax year.
      </p>
    </div>
  )
}

// ===== Placeholder 小组件 =====

// Placeholder 内的 taxpayer band 分段按钮 — 占位状态下也可交互
function PlaceholderBandBtn({
  active,
  onClick,
  label,
  rate,
}: {
  active: boolean
  onClick: () => void
  label: string
  rate: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 px-3 py-2 text-xs rounded-md transition-colors flex items-center justify-center gap-2',
        active
          ? 'bg-[var(--ink)] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.20)]'
          : 'text-[var(--ink-3)] font-medium hover:text-[var(--ink)]'
      )}
    >
      <span>{label}</span>
      <span className={cn('num text-[10px]', active ? 'opacity-80' : 'text-[var(--ink-5)]')}>
        {rate}
      </span>
    </button>
  )
}

function PlaceholderMetric({
  label,
  emphasis,
  sign,
}: {
  label: string
  emphasis?: boolean
  sign?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4 border',
        emphasis ? 'glass-panel-strong border-white/85' : 'bg-white/40 border-[var(--hairline)]'
      )}
    >
      <span className="block text-[10px] uppercase tracking-[0.12em] text-[var(--ink-5)] font-medium mb-2">
        {label}
      </span>
      <p
        className={cn(
          'num-display tracking-tight text-[var(--ink-5)]',
          emphasis ? 'text-2xl md:text-[26px]' : 'text-lg md:text-xl'
        )}
      >
        {sign && <span className="text-[var(--ink-6)] mr-1">{sign}</span>}
        £——
      </p>
    </div>
  )
}

function PlaceholderTerm({ label, emphasis }: { label: string; emphasis?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-5)] font-medium">
        {label}
      </span>
      <span
        className={cn(
          'num-display text-[var(--ink-5)]',
          emphasis ? 'text-xl md:text-[22px]' : 'text-base md:text-lg'
        )}
      >
        £——
      </span>
    </div>
  )
}

function PlaceholderStat({ label }: { label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-5)] font-medium">
        {label}
      </span>
      <span className="num text-sm font-medium text-[var(--ink-5)]">——</span>
    </span>
  )
}

function PlaceholderRow({
  label,
  emphasis,
  subdued,
  sign,
}: {
  label: string
  emphasis?: boolean
  subdued?: boolean
  sign?: string
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span
        className={cn(
          'text-sm',
          subdued ? 'text-[var(--ink-5)]' : 'text-[var(--ink-4)]',
          emphasis && 'font-semibold text-[var(--ink-3)]'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'num',
          emphasis ? 'text-base font-semibold text-[var(--ink-3)]' : 'text-sm font-medium text-[var(--ink-5)]'
        )}
      >
        {sign && <span className="text-[var(--ink-6)] mr-1">{sign}</span>}
        £——
      </span>
    </div>
  )
}
