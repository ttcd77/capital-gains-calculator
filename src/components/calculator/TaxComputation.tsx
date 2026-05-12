'use client'

import type { CGTResult, TaxpayerType } from '@/lib/types'
import { formatGBP, formatGBPAccounting, formatPercent } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface TaxComputationProps {
  results: CGTResult
  taxpayerType: TaxpayerType
  onTaxpayerTypeChange: (type: TaxpayerType) => void
}

export function TaxComputation({ results, taxpayerType, onTaxpayerTypeChange }: TaxComputationProps) {
  const isLoss = results.totalGain < 0
  const hasTax = results.taxDue > 0

  return (
    <div className="glass-panel p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-3">
          <span className="num text-[10px] text-[var(--ink-5)] tracking-[0.18em] font-medium shrink-0">
            04
          </span>
          <span className="h-px bg-[var(--hairline)] w-6 shrink-0 self-center" />
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-[var(--ink)] tracking-tight">
              Tax computation
            </h3>
            <p className="text-[11px] text-[var(--ink-4)] mt-0.5">
              Apply annual exemption and band the remainder against your rate.
            </p>
          </div>
        </div>

        {/* Taxpayer band — 分段控件,与 Buy/Sell 同语言 */}
        <div className="space-y-1.5 min-w-[280px]">
          <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-5)] font-medium">
            Taxpayer band
          </label>
          <TaxpayerBandToggle
            value={taxpayerType}
            onChange={onTaxpayerTypeChange}
          />
        </div>
      </div>

      {/* Computation flow */}
      <div className="rounded-2xl bg-white/30 border border-[var(--hairline)] divide-y divide-[var(--hairline-soft)]">
        <Row
          label="Net gain / (loss)"
          value={formatGBPAccounting(results.totalGain)}
          accounting={isLoss}
        />
        <Row
          label="Annual exemption"
          value={formatGBP(results.annualExemption)}
          sign="−"
          subdued
        />
        <Row
          label="Taxable gain"
          value={formatGBP(results.taxableGain)}
          emphasis
        />
        <Row
          label="Tax rate"
          value={formatPercent(results.taxRate)}
          subdued
        />
      </div>

      {/* Final tax due — 玻璃强调块 */}
      <div
        className={cn(
          'rounded-2xl px-6 py-5 border flex items-center justify-between flex-wrap gap-3 transition',
          hasTax
            ? 'glass-panel-strong border-[var(--ink)]'
            : 'bg-white/40 border-[var(--hairline-strong)]'
        )}
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--ink-3)]">
            Capital Gains Tax due
          </p>
          <p className="text-[11px] text-[var(--ink-5)] mt-0.5">
            {isLoss
              ? 'A loss arises — carry forward against future gains.'
              : hasTax
              ? `Reportable via Self Assessment or Real-Time CGT.`
              : 'Within the annual exemption — no tax payable.'}
          </p>
        </div>
        <p className="num-display text-3xl md:text-[34px] tracking-tight text-[var(--ink)]">
          {formatGBP(results.taxDue)}
        </p>
      </div>

      <p className="text-[11px] text-[var(--ink-5)] leading-relaxed">
        Estimate for educational purposes only. Not tax advice — consult a qualified adviser for your specific situation.
        Rates and thresholds reflect the 2024 / 25 UK tax year.
      </p>
    </div>
  )
}

// ============================================================
// Taxpayer band toggle — 分段控件
// 两档 (Basic / Higher) 用 segmented control 表达,无 dropdown,
// 视觉与 TransactionForm 的 Buy/Sell 同语言。
// shares 用 10/18,property 18% 不在 calculator scope 内,这里 18% 不显示。
// ============================================================
function TaxpayerBandToggle({
  value,
  onChange,
}: {
  value: TaxpayerType
  onChange: (v: TaxpayerType) => void
}) {
  return (
    <div className="glass-input p-0.5 flex">
      <BandBtn
        active={value === 'basic'}
        onClick={() => onChange('basic')}
        label="Basic"
        rate="18%"
      />
      <BandBtn
        active={value === 'higher'}
        onClick={() => onChange('higher')}
        label="Higher"
        rate="24%"
      />
    </div>
  )
}

function BandBtn({
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

function Row({
  label,
  value,
  emphasis,
  subdued,
  sign,
  accounting,
}: {
  label: string
  value: string
  emphasis?: boolean
  subdued?: boolean
  sign?: string
  accounting?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span
        className={cn(
          'text-sm',
          subdued ? 'text-[var(--ink-4)]' : 'text-[var(--ink-2)]',
          emphasis && 'font-semibold text-[var(--ink)]'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'num',
          emphasis ? 'text-base font-semibold text-[var(--ink)]' : 'text-sm font-medium',
          !emphasis && (subdued ? 'text-[var(--ink-4)]' : 'text-[var(--ink-2)]'),
          accounting && 'italic'
        )}
      >
        {sign && <span className="text-[var(--ink-5)] mr-1">{sign}</span>}
        {value}
      </span>
    </div>
  )
}
