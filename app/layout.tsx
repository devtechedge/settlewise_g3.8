import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Settlewise — Shared Expense Reconciliation & Settlement Planning',
  description: 'Auditable shared expense reconciliation, exact integer-minor-unit monetary ledger, and deterministic settlement planner.',
  openGraph: {
    title: 'Settlewise — Shared Expense Reconciliation & Settlement Planning',
    description: 'Auditable shared expense reconciliation, exact integer-minor-unit monetary ledger, and deterministic settlement planner.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Settlewise — Shared Expense Reconciliation & Settlement Planning',
    description: 'Auditable shared expense reconciliation, exact integer-minor-unit monetary ledger, and deterministic settlement planner.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#fbf9f4] text-[#1c2826] antialiased font-sans selection:bg-[#e4d9c7] selection:text-[#1c2826]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
