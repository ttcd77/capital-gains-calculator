import Papa from 'papaparse'
import type { FileParser, FileParseResult, ParsedRow, ParseError } from './types'
import { parseRowFromRecord } from './row-parser'

export class CsvParser implements FileParser {
  readonly supportedExtensions = ['.csv']

  async parse(file: File): Promise<FileParseResult> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim().toLowerCase(),
        complete: (results) => {
          const data: ParsedRow[] = []
          const errors: ParseError[] = []

          for (let i = 0; i < results.data.length; i++) {
            const raw = results.data[i] as Record<string, string>
            const parsed = parseRowFromRecord(raw, i + 1)
            if (parsed.error) {
              errors.push(parsed.error)
            } else if (parsed.row) {
              data.push(parsed.row)
            }
          }

          resolve({
            success: errors.length === 0 && data.length > 0,
            data,
            errors,
            totalRowsRead: results.data.length,
            fileName: file.name,
          })
        },
        error: (err) => {
          resolve({
            success: false,
            data: [],
            errors: [{ row: 0, message: `CSV parse failed: ${err.message}` }],
            totalRowsRead: 0,
            fileName: file.name,
          })
        },
      })
    })
  }
}
