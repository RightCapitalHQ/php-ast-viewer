'use client';
import { Inter } from 'next/font/google';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// https://github.com/vercel/next.js/issues/44125#issuecomment-1372270391
function StyleProviderLayout({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => createCache());

  const render = <>{children}</>;

  useServerInsertedHTML(() => {
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: `</script>${extractStyle(cache)}<script>`,
        }}
      />
    );
  });

  if (typeof window !== 'undefined') {
    return render;
  }

  return <StyleProvider cache={cache}>{render}</StyleProvider>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <link rel='icon' href='./favicon.svg' sizes='any' type='image/svg+xml' />
      <body className={inter.className}>
        <StyleProviderLayout>{children}</StyleProviderLayout>
      </body>
    </html>
  );
}
