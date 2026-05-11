export interface ParsedRow {
  date: string        // YYYY-MM-DD
  ticker: string      // 证券代码 — 同 ticker 视为同一只股票
  type: 'buy' | 'sell'
  shares: number
  pricePerShare: number
}

export interface ParseError {
  row: number         // 1-based row number in the original file
  message: string
  rawData?: string
}

export interface FileParseResult {
  success: boolean
  data: ParsedRow[]
  errors: ParseError[]
  totalRowsRead: number
  fileName: string
}

export interface FileParser {
  parse(file: File): Promise<FileParseResult>
  readonly supportedExtensions: string[]
}
