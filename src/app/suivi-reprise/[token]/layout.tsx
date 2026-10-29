import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suivi de reprise - Mac Place",
  description: "Suivez la reprise de votre Mac en temps réel.",
  robots: { index: false, follow: false },
};

export default function BuybackTrackingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-[#d2d2d7]/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Mac Place" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-lg font-semibold tracking-tight text-[#1d1d1f]">Mac Place</span>
          </div>
          <span className="text-sm text-[#86868b]">Suivi de reprise</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
      <footer className="border-t border-[#d2d2d7]/40 bg-[#f5f5f7]">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-[#86868b] sm:flex-row">
          <span>Mac Place · 39 rue du 11 novembre 1918, 94700 Maisons-Alfort</span>
          <a href="tel:+33782712123" className="transition-colors hover:text-[#1d1d1f]">
            07 82 71 21 23
          </a>
        </div>
      </footer>
    </div>
  );
}
