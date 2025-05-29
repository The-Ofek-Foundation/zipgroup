import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
// ThemeProvider will be managed by useAppData and applied in page.tsx or a client wrapper there
// For now, layout.tsx remains simpler. Theme is applied to <html> via ThemeProvider's useEffect.

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LinkWarp', // Default title, will be overridden by pageTitle
  description: 'Warp through your links with organized groups.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ThemeProvider will wrap content in page.tsx or a client component there */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
