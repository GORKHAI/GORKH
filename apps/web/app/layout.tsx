import type { Metadata } from 'next';
import './globals.css';
import { SiteShell } from '../components/site-shell';

export const metadata: Metadata = {
  title: 'GORKH — AI That Runs on Your Mac',
  description:
    'GORKH is a desktop-native AI agent that controls your Mac with your approval. Local-first, privacy-centric, and built for real workflows.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
