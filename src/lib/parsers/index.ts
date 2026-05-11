import type { FileParser, FileParseResult } from './types'
import { CsvParser } from './csv-parser'
import { ExcelParser } from './excel-parser'

export type { FileParseResult, ParsedRow, ParseError, FileParser } from './types'

// Register parsers here. To add a new format (e.g. PDF), create a parser
// implementing the FileParser interface and add it to this array.
const parsers: FileParser[] = [
  new CsvParser(),
  new ExcelParser(),
]

export function getParserForFile(fileName: string): FileParser | null {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase()
  return parsers.find((p) => p.supportedExtensions.includes(ext)) ?? null
}

export function getSupportedExtensions(): string[] {
  return parsers.flatMap((p) => p.supportedExtensions)
}

export async function parseFile(file: File): Promise<FileParseResult> {
  const parser = getParserForFile(file.name)
  if (!parser) {
    return {
      success: false,
      data: [],
      errors: [{
        row: 0,
        message: `Unsupported file type. Supported: ${getSupportedExtensions().join(', ')}`,
      }],
      totalRowsRead: 0,
      fileName: file.name,
    }
  }
  return parser.parse(file)
}
