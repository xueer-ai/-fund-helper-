import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '源哥AI基金监控助手',
  description: '源哥AI基金每日建仓 & 全持仓监控预警助手',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
