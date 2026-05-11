import { CGTCalculator } from '@/components/calculator/CGTCalculator'

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <div className="max-w-[1480px] mx-auto px-6 pt-10 pb-16 md:px-10">

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="step-tag">UK · 2024 / 25</span>
          </div>
          <h1 className="text-3xl md:text-[36px] font-semibold text-[var(--ink)] tracking-[-0.025em] leading-[1.05]">
            Capital Gains Tax
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-3)] max-w-[560px] leading-relaxed">
            Share disposals — Same Day, 30-Day, and Section 104 matching applied in order,
            with a full working paper for every disposal.
          </p>
        </header>

        <CGTCalculator />

        <footer className="mt-14 pt-5 border-t border-[var(--hairline)] flex flex-col gap-1 text-[11px] text-[var(--ink-5)] md:flex-row md:justify-between">
          <span>
            Educational tool. Not tax advice — always confirm with a qualified adviser.
          </span>
          <span className="num">
            2024 / 25
          </span>
        </footer>
      </div>
    </main>
  )
}
