'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Transaction } from '@/lib/types'
import type { FileParseResult } from '@/lib/parsers'
import { parseFile, getSupportedExtensions } from '@/lib/parsers'
import { formatDate, formatGBP } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface FileImportProps {
  onImport: (transactions: Transaction[]) => void
}

export function FileImport({ onImport }: FileImportProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [parseResult, setParseResult] = useState<FileParseResult | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setIsParsing(true)
    const result = await parseFile(file)
    setIsParsing(false)
    setParseResult(result)
    setIsDialogOpen(true)
  }, [])

  useEffect(() => {
    const zone = dropZoneRef.current
    if (!zone) return

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }
    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const file = e.dataTransfer?.files[0]
      if (file) handleFile(file)
    }

    zone.addEventListener('dragenter', onDragEnter)
    zone.addEventListener('dragover', onDragOver)
    zone.addEventListener('dragleave', onDragLeave)
    zone.addEventListener('drop', onDrop)

    const preventBrowserDefault = (e: DragEvent) => {
      e.preventDefault()
    }
    document.addEventListener('dragover', preventBrowserDefault)
    document.addEventListener('drop', preventBrowserDefault)

    return () => {
      zone.removeEventListener('dragenter', onDragEnter)
      zone.removeEventListener('dragover', onDragOver)
      zone.removeEventListener('dragleave', onDragLeave)
      zone.removeEventListener('drop', onDrop)
      document.removeEventListener('dragover', preventBrowserDefault)
      document.removeEventListener('drop', preventBrowserDefault)
    }
  }, [handleFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  const handleConfirmImport = useCallback(() => {
    if (!parseResult) return
    const transactions: Transaction[] = parseResult.data.map((row) => ({
      id: crypto.randomUUID(),
      date: row.date,
      ticker: row.ticker,
      type: row.type,
      shares: row.shares,
      pricePerShare: row.pricePerShare,
    }))
    onImport(transactions)
    setIsDialogOpen(false)
    setParseResult(null)
  }, [parseResult, onImport])

  const acceptString = getSupportedExtensions().join(',')

  return (
    <>
      <div
        ref={dropZoneRef}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'glass-panel flex flex-col items-center justify-center gap-3 p-6 cursor-pointer transition-all duration-200 min-h-[148px]',
          isDragging && 'ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-transparent scale-[1.01]'
        )}
      >
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full transition-colors border border-[var(--hairline-strong)]',
          isDragging
            ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
            : 'bg-white/55 text-[var(--ink-2)]'
        )}>
          {isParsing ? <FileSpreadsheet className="h-5 w-5 animate-pulse" /> : <Upload className="h-5 w-5" />}
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-[var(--ink)]">
            {isParsing ? 'Parsing file…' : isDragging ? 'Release to import' : 'Drop CSV or Excel here'}
          </p>
          <p className="text-[11px] text-[var(--ink-4)]">
            or click — .csv · .xlsx · .xls
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto glass-panel-strong border-none">
          <DialogHeader>
            <DialogTitle className="text-[var(--ink)] text-base">
              Import preview — <span className="num text-[var(--ink-4)]">{parseResult?.fileName}</span>
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-4)] text-xs">
              Review the parsed transactions before importing.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 items-center">
            {parseResult && parseResult.data.length > 0 && (
              <span className="ink-pill ink-pill-strong gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                {parseResult.data.length} parsed
              </span>
            )}
            {parseResult && parseResult.errors.length > 0 && (
              <span className="ink-pill ink-pill-strong gap-1.5">
                <AlertCircle className="h-3 w-3" />
                {parseResult.errors.length} errors
              </span>
            )}
          </div>

          {parseResult && parseResult.errors.length > 0 && (
            <div className="rounded-xl border border-[var(--hairline-strong)] bg-white/40 p-3 space-y-1 text-xs">
              {parseResult.errors.slice(0, 10).map((err, i) => (
                <p key={i} className="text-[var(--ink-2)]">
                  <span className="num font-semibold text-[var(--ink)]">Row {err.row}:</span> {err.message}
                </p>
              ))}
              {parseResult.errors.length > 10 && (
                <p className="text-[var(--ink-2)] font-medium num">
                  …and {parseResult.errors.length - 10} more
                </p>
              )}
            </div>
          )}

          {parseResult && parseResult.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--hairline)]">
                  <TableHead className="text-[var(--ink-5)] text-[10px] uppercase tracking-[0.12em]">Date</TableHead>
                  <TableHead className="text-[var(--ink-5)] text-[10px] uppercase tracking-[0.12em]">Ticker</TableHead>
                  <TableHead className="text-[var(--ink-5)] text-[10px] uppercase tracking-[0.12em]">Type</TableHead>
                  <TableHead className="text-[var(--ink-5)] text-[10px] uppercase tracking-[0.12em] text-right">Shares</TableHead>
                  <TableHead className="text-[var(--ink-5)] text-[10px] uppercase tracking-[0.12em] text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parseResult.data.slice(0, 50).map((row, i) => (
                  <TableRow key={i} className="border-[var(--hairline-soft)]">
                    <TableCell className="num text-sm text-[var(--ink-2)]">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell className="num text-sm font-medium text-[var(--ink)]">
                      {row.ticker}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'ink-pill',
                        row.type === 'sell' && 'ink-pill-strong'
                      )}>
                        {row.type.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="num text-right text-[var(--ink-2)]">
                      {row.shares.toLocaleString()}
                    </TableCell>
                    <TableCell className="num text-right text-[var(--ink-2)]">
                      {formatGBP(row.pricePerShare)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {parseResult && parseResult.data.length > 50 && (
            <p className="text-xs text-[var(--ink-5)] text-center num">
              Showing first 50 of {parseResult.data.length}
            </p>
          )}

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="ghost-btn inline-flex items-center px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parseResult || parseResult.data.length === 0}
              className="ink-btn inline-flex items-center px-5 py-2 text-sm font-medium"
            >
              Import {parseResult?.data.length ?? 0} transactions
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
