import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SettleWise - Shared Expense Reconciliation & Settlement Planning',
  description:
    'Auditable shared expense reconciliation, exact integer-minor-unit monetary ledger, and deterministic settlement planner.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'SettleWise - Shared Expense Reconciliation & Settlement Planning',
    description:
      'Auditable shared expense reconciliation, exact integer-minor-unit monetary ledger, and deterministic settlement planner.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SettleWise - Shared Expense Reconciliation & Settlement Planning',
    description:
      'Auditable shared expense reconciliation, exact integer-minor-unit monetary ledger, and deterministic settlement planner.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[var(--sw-bg)] text-[var(--sw-ink)] antialiased font-sans selection:bg-[#e4d9c7] selection:text-[var(--sw-ink)]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
