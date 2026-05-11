import type { ParsedRow, ParseError } from './types'

export function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim()

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  // DD/MM/YYYY (UK format — preferred since this is a UK tax tool)
  const ukMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (ukMatch) {
    const [, day, month, year] = ukMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return null
}

export function parseRowFromRecord(
  raw: Record<string, string>,
  rowNum: number
): { row?: ParsedRow; error?: ParseError } {
  const date = raw['date'] ?? raw['trade date'] ?? raw['tradedate'] ?? ''
  const tickerRaw =
    raw['ticker'] ??
    raw['symbol'] ??
    raw['security'] ??
    raw['stock'] ??
    raw['code'] ??
    raw['instrument'] ??
    ''
  const typeStr = (raw['type'] ?? raw['action'] ?? raw['side'] ?? '').trim().toLowerCase()
  const sharesStr = raw['shares'] ?? raw['quantity'] ?? raw['qty'] ?? ''
  const priceStr =
    raw['pricepershare'] ?? raw['price/share'] ?? raw['price'] ?? raw['unit price'] ?? ''

  if (typeStr !== 'buy' && typeStr !== 'sell') {
    return {
      error: {
        row: rowNum,
        message: `Invalid type "${typeStr}" — must be "buy" or "sell"`,
        rawData: JSON.stringify(raw),
      },
    }
  }

  const ticker = tickerRaw.trim().toUpperCase()
  if (!ticker) {
    return {
      error: {
        row: rowNum,
        message: `Missing ticker — provide a "ticker" / "symbol" / "security" column to identify the stock`,
        rawData: JSON.stringify(raw),
      },
    }
  }

  const normalizedDate = normalizeDate(date)
  if (!normalizedDate) {
    return {
      error: {
        row: rowNum,
        message: `Invalid date "${date}" — expected YYYY-MM-DD or DD/MM/YYYY`,
        rawData: JSON.stringify(raw),
      },
    }
  }

  const shares = parseFloat(sharesStr.replace(/,/g, ''))
  const pricePerShare = parseFloat(priceStr.replace(/[£$,]/g, ''))

  if (isNaN(shares) || shares <= 0) {
    return { error: { row: rowNum, message: `Invalid shares "${sharesStr}"` } }
  }
  if (isNaN(pricePerShare) || pricePerShare <= 0) {
    return { error: { row: rowNum, message: `Invalid price "${priceStr}"` } }
  }

  return { row: { date: normalizedDate, ticker, type: typeStr, shares, pricePerShare } }
}
