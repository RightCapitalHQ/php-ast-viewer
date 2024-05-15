import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PHP AST Viewer',
  description: 'View the Abstract Syntax Tree (AST) of PHP code parsed by the PHP-Parser library.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <link rel='icon' href='./favicon.svg' sizes='any' type='image/svg+xml' />
      <body className={inter.className}>{children}</body>
    </html>
  );
}
