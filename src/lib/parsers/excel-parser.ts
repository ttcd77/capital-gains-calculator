import * as XLSX from 'xlsx'
import type { FileParser, FileParseResult, ParsedRow, ParseError } from './types'
import { parseRowFromRecord } from './row-parser'

export class ExcelParser implements FileParser {
  readonly supportedExtensions = ['.xlsx', '.xls']

  async parse(file: File): Promise<FileParseResult> {
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        return {
          success: false,
          data: [],
          errors: [{ row: 0, message: 'Excel file contains no sheets' }],
          totalRowsRead: 0,
          fileName: file.name,
        }
      }

      const sheet = workbook.Sheets[sheetName]
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false,
      })

      // Normalize headers to lowercase
      const rows = rawRows.map((row) => {
        const normalized: Record<string, string> = {}
        for (const [key, val] of Object.entries(row)) {
          normalized[key.trim().toLowerCase()] = String(val).trim()
        }
        return normalized
      })

      const data: ParsedRow[] = []
      const errors: ParseError[] = []

      for (let i = 0; i < rows.length; i++) {
        const parsed = parseRowFromRecord(rows[i], i + 1)
        if (parsed.error) {
          errors.push(parsed.error)
        } else if (parsed.row) {
          data.push(parsed.row)
        }
      }

      return {
        success: errors.length === 0 && data.length > 0,
        data,
        errors,
        totalRowsRead: rows.length,
        fileName: file.name,
      }
    } catch (err) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, message: `Excel parse failed: ${(err as Error).message}` }],
        totalRowsRead: 0,
        fileName: file.name,
      }
    }
  }
}
