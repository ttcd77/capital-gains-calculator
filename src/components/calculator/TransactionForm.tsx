'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Transaction, TransactionType } from '@/lib/types'
import { DatePicker } from '@/components/ui/date-picker'

interface TransactionFormProps {
  onAdd: (transaction: Transaction) => void
}

export function TransactionForm({ onAdd }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('buy')
  const [date, setDate] = useState('')
  // ticker 记住上次输入,方便连续录入同一只股票
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [pricePerShare, setPricePerShare] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const sharesNum = parseFloat(shares)
    const priceNum = parseFloat(pricePerShare)
    const tickerNormalized = ticker.trim().toUpperCase()

    if (
      !date ||
      !tickerNormalized ||
      isNaN(sharesNum) ||
      isNaN(priceNum) ||
      sharesNum <= 0 ||
      priceNum <= 0
    ) {
      return
    }

    onAdd({
      id: crypto.randomUUID(),
      date,
      ticker: tickerNormalized,
      type,
      shares: sharesNum,
      pricePerShare: priceNum,
    })

    // 只清数字字段,保留 ticker 方便录同一只股票的多笔交易
    setShares('')
    setPricePerShare('')
  }

  const total =
    shares && pricePerShare && !isNaN(parseFloat(shares)) && !isNaN(parseFloat(pricePerShare))
      ? parseFloat(shares) * parseFloat(pricePerShare)
      : null

  return (
    <div className="glass-panel p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--ink)] tracking-tight">
          New transaction
        </h3>
        {total !== null && (
          <span className="text-[11px] text-[var(--ink-4)]">
            Consideration:&nbsp;
            <span className="num font-medium text-[var(--ink)]">
              £{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </span>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-3 sm:grid-cols-[120px_1fr_110px_1fr_1fr_auto] sm:items-end"
      >
        {/* Type 切换 — segmented control,纯单色 */}
        <Field label="Type">
          <div className="glass-input p-0.5 flex">
            <SegBtn active={type === 'buy'} onClick={() => setType('buy')}>
              Buy
            </SegBtn>
            <SegBtn active={type === 'sell'} onClick={() => setType('sell')}>
              Sell
            </SegBtn>
          </div>
        </Field>

        <Field label="Date">
          <DatePicker value={date} onChange={setDate} required placeholder="Select date" />
        </Field>

        <Field label="Ticker">
          <input
            type="text"
            placeholder="TSCO"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            required
            maxLength={12}
            className="glass-input w-full px-3 py-2 num text-sm uppercase text-[var(--ink)] focus:outline-none placeholder:text-[var(--ink-5)] tracking-wider"
          />
        </Field>

        <Field label="Shares">
          <input
            type="number"
            step="any"
            min="0.01"
            placeholder="100"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            required
            className="glass-input w-full px-3 py-2 num text-sm text-[var(--ink)] focus:outline-none placeholder:text-[var(--ink-5)]"
          />
        </Field>

        <Field label="Price / share">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-5)] text-sm pointer-events-none">£</span>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              placeholder="5.00"
              value={pricePerShare}
              onChange={(e) => setPricePerShare(e.target.value)}
              required
              className="glass-input w-full pl-6 pr-3 py-2 num text-sm text-[var(--ink)] focus:outline-none placeholder:text-[var(--ink-5)]"
            />
          </div>
        </Field>

        <button
          type="submit"
          className="ink-btn inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium col-span-2 sm:col-span-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <label className="text-[10px] uppercase tracking-[0.12em] font-medium text-[var(--ink-5)]">
        {label}
      </label>
      {children}
    </div>
  )
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
        active
          ? 'bg-[var(--ink)] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.20)]'
          : 'text-[var(--ink-3)] font-medium hover:text-[var(--ink)]'
      }`}
    >
      {children}
    </button>
  )
}
