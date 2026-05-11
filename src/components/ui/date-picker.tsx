'use client'

/**
 * 自定义日期选择器 — 替换浏览器原生 <input type="date">。
 *
 * 原生 date input 的 placeholder("日月年" / "dd/mm/yyyy")由**浏览器 UI 语言**
 * 决定,跟页面 lang 无关。中文系统下永远显示中文,即使整个站点是英文界面。
 * 本组件用 react-day-picker + radix Popover 完全脱离浏览器本地化,固定英文显示。
 */

import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { DayPicker } from 'react-day-picker'
import { enGB } from 'date-fns/locale'
import { parse, format, isValid } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import 'react-day-picker/style.css'

interface DatePickerProps {
  /** 当前值 — ISO YYYY-MM-DD 字符串,空串表示未选择 */
  value: string
  /** 选择后回调,传 ISO YYYY-MM-DD 字符串 */
  onChange: (isoDate: string) => void
  /** 占位符 */
  placeholder?: string
  /** 必填(配 form validation) */
  required?: boolean
  /** trigger 样式扩展 */
  className?: string
  /** trigger 文本前的 icon */
  showIcon?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  required,
  className,
  showIcon = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // ISO 字符串 ⇄ Date 对象转换
  const selected = React.useMemo(() => {
    if (!value) return undefined
    const d = parse(value, 'yyyy-MM-dd', new Date())
    return isValid(d) ? d : undefined
  }, [value])

  const displayText = selected ? format(selected, 'dd MMM yyyy', { locale: enGB }) : ''

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'))
      setOpen(false)
    } else {
      onChange('')
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={selected ? `Date: ${displayText}` : placeholder}
          className={cn(
            'glass-input w-full px-3 py-2 text-sm text-left focus:outline-none flex items-center gap-2 cursor-pointer transition-colors',
            'hover:bg-white/55',
            selected ? 'text-[var(--ink)]' : 'text-[var(--ink-5)]',
            className
          )}
        >
          {showIcon && <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[var(--ink-4)]" />}
          <span className={cn('num flex-1 truncate', !selected && 'tracking-normal font-normal')}>
            {displayText || placeholder}
          </span>
        </button>
      </PopoverPrimitive.Trigger>
      {/* 隐藏的 hidden input 给 form required 校验用 */}
      {required && (
        <input
          type="text"
          required
          value={value}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      )}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          align="start"
          className="z-50 p-2 rounded-2xl outline-none bg-white/[0.97] backdrop-blur-2xl border border-[var(--hairline)] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.30)]"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={enGB}
            weekStartsOn={1}
            showOutsideDays
            captionLayout="dropdown"
            classNames={DAYPICKER_CLASSNAMES}
            today={new Date()}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

// ─────────────────────────────────────────────────────────
// react-day-picker 10.x 类名覆盖 — 跟 ink/glass 单色调色板对齐
// ─────────────────────────────────────────────────────────

const DAYPICKER_CLASSNAMES = {
  root: 'rdp-ink num',
  months: 'flex flex-col gap-2',
  month: 'flex flex-col gap-2 p-2',
  month_caption: 'flex items-center justify-center gap-1 text-sm font-semibold text-[var(--ink)] py-1',
  caption_label: 'hidden',
  dropdowns: 'flex items-center gap-1.5',
  dropdown_root: 'relative inline-flex items-center',
  dropdown:
    'glass-input text-xs px-2 py-1 rounded-md text-[var(--ink-2)] focus:outline-none cursor-pointer appearance-none pr-5',
  nav: 'flex items-center gap-1',
  button_previous:
    'h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--ink-3)] hover:bg-[var(--ink)]/10 hover:text-[var(--ink)] active:bg-[var(--ink)]/15 transition-colors',
  button_next:
    'h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--ink-3)] hover:bg-[var(--ink)]/10 hover:text-[var(--ink)] active:bg-[var(--ink)]/15 transition-colors',
  month_grid: 'w-full border-collapse',
  weekdays: 'flex',
  weekday:
    'flex-1 h-7 inline-flex items-center justify-center text-[10px] uppercase tracking-[0.1em] text-[var(--ink-5)] font-medium',
  week: 'flex w-full',
  day: 'flex-1 h-8 p-0 relative',
  day_button:
    'w-full h-full inline-flex items-center justify-center rounded-md text-[12px] num text-[var(--ink-2)] hover:bg-[var(--ink)]/10 hover:text-[var(--ink)] active:bg-[var(--ink)]/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer',
  selected:
    '[&_button]:bg-[var(--ink)] [&_button]:text-white [&_button]:font-semibold [&_button:hover]:bg-[var(--ink-2)]',
  today: '[&_button]:ring-1 [&_button]:ring-[var(--ink-4)] [&_button]:ring-inset',
  outside: '[&_button]:text-[var(--ink-6)]',
  disabled: '[&_button]:text-[var(--ink-6)] [&_button]:opacity-40',
  hidden: 'invisible',
}
