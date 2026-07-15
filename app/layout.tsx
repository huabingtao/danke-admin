import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: '呱呱弹壳空间 · 数据中台',
  description: '《弹壳特攻队》自媒体博主“弹壳呱呱”的数据运营管理中台。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="bg-zinc-950 text-zinc-100">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
