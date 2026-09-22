import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'Social Replies',
  description: 'A private assistant for writing and remembering replies.',
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The workspace must remain zoomable to 200% (D01/D13).
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ ['--sr-font-ui' as string]: GeistSans.style.fontFamily }}>
      <body>{children}</body>
    </html>
  );
}
