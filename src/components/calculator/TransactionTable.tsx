'use client'

import { X } from 'lucide-react'
import type { Transaction } from '@/lib/types'
import { formatDate, formatGBP } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface TransactionTableProps {
  transactions: Transaction[]
  onRemove: (id: string) => void
  errorTransactionIds?: Set<string>
}

export function TransactionTable({ transactions, onRemove, errorTransactionIds }: TransactionTableProps) {
  const sorted = [...transactions].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date)
    if (dateCmp !== 0) return dateCmp
    return a.ticker.localeCompare(b.ticker)
  })

  if (transactions.length === 0) {
    return (
      <div className="glass-panel p-12 text-center">
        <p className="text-sm text-[var(--ink-4)]">
          No transactions yet. Add buy and sell transactions above.
        </p>
      </div>
    )
  }

  const totals = sorted.reduce(
    (acc, t) => {
      if (t.type === 'buy') {
        acc.buyCount += 1
        acc.buyValue += t.shares * t.pricePerShare
      } else {
        acc.sellCount += 1
        acc.sellValue += t.shares * t.pricePerShare
      }
      return acc
    },
    { buyCount: 0, buyValue: 0, sellCount: 0, sellValue: 0 }
  )

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--hairline)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink)] tracking-tight">
            Transaction ledger
          </h3>
          <p className="text-[11px] text-[var(--ink-4)] mt-0.5">
            Sorted chronologically · {transactions.length} entries
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[11px]">
          <LedgerStat label="Buys" count={totals.buyCount} value={totals.buyValue} />
          <span className="text-[var(--ink-5)]">·</span>
          <LedgerStat label="Sells" count={totals.sellCount} value={totals.sellValue} emphasis />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--hairline)]">
              <Th>Date</Th>
              <Th>Ticker</Th>
              <Th>Type</Th>
              <Th align="right">Shares</Th>
              <Th align="right">Price / share</Th>
              <Th align="right">Consideration</Th>
              <Th align="right" width="48px"></Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, idx) => {
              const isError = errorTransactionIds?.has(t.id)
              const isLast = idx === sorted.length - 1
              return (
                <tr
                  key={t.id}
                  className={cn(
                    'group transition-colors',
                    !isLast && 'border-b border-[var(--hairline-soft)]',
                    isError
                      ? 'bg-[rgba(26,28,30,0.04)]'
                      : 'hover:bg-white/35'
                  )}
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      {isError && (
                        <span className="h-2 w-2 rounded-full bg-[var(--ink)] shrink-0" />
                      )}
                      <span className="num text-[var(--ink-2)]">
                        {formatDate(t.date)}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="num text-[var(--ink)] font-semibold tracking-wider">
                      {t.ticker}
                    </span>
                  </Td>
                  <Td>
                    <span className={cn(
                      'ink-pill',
                      t.type === 'sell' && 'ink-pill-strong'
                    )}>
                      {t.type === 'buy' ? 'BUY' : 'SELL'}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="num text-[var(--ink-2)]">
                      {t.shares.toLocaleString()}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="num text-[var(--ink-2)]">
                      {formatGBP(t.pricePerShare)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="num font-medium text-[var(--ink)]">
                      {formatGBP(t.shares * t.pricePerShare)}
                    </span>
                  </Td>
                  <Td align="right">
                    <button
                      onClick={() => onRemove(t.id)}
                      aria-label="Remove transaction"
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--ink-5)] hover:text-[var(--ink)] hover:bg-[rgba(26,28,30,0.06)] transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ===== 小组件 =====

function Th({
  children,
  align = 'left',
  width,
}: {
  children?: React.ReactNode
  align?: 'left' | 'right'
  width?: string
}) {
  return (
    <th
      style={width ? { width } : undefined}
      className={`px-4 py-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ink-5)] ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <td className={`px-4 py-2.5 text-sm ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </td>
  )
}

function LedgerStat({
  label,
  count,
  value,
  emphasis,
}: {
  label: string
  count: number
  value: number
  emphasis?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[var(--ink-5)]">{label}</span>
      <span className={cn(
        'num font-semibold',
        emphasis ? 'text-[var(--ink)]' : 'text-[var(--ink-2)]'
      )}>{count}</span>
      <span className="num text-[var(--ink-5)]">·</span>
      <span className="num text-[var(--ink-2)]">{formatGBP(value)}</span>
    </span>
  )
}
