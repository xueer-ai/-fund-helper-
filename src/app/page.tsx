'use client';

import { useState, useEffect } from 'react';
import { useFundData, type FundRealtimeData } from '@/lib/hooks';
import type { TabId } from '@/lib/types';

import DashboardOverview from '@/components/dashboard-overview';
import BuySignalPanel from '@/components/buy-signal-panel';
import PortfolioPanel from '@/components/portfolio-panel';
import LearningPanel from '@/components/learning-panel';
import RiskAlertPanel from '@/components/risk-alert-panel';
import CommandPanel from '@/components/command-panel';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: '总览' },
  { id: 'buy', label: '买点' },
  { id: 'portfolio', label: '持仓' },
  { id: 'learning', label: '学习' },
  { id: 'risk', label: '风控' },
  { id: 'command', label: '指令' },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [now, setNow] = useState<string>('');

  const { fundData: funds, loading, dataQuality, refresh } = useFundData();

  useEffect(() => {
    const update = () => {
      setNow(new Date().toLocaleString('zh-CN', { hour12: false }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const isWorkday = new Date().getDay() >= 1 && new Date().getDay() <= 5;

  const daysToNationalDay = Math.max(
    0,
    Math.ceil((new Date('2026-10-01').getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  const daysToStopLoss = Math.max(
    0,
    Math.ceil((new Date('2026-11-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* ===== 顶栏：红色标题 + 标签 + 倒计时 + 校准 + 时间 ===== */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb]">
        <div className="flex items-center justify-between px-5 h-11">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-[#dc2626]">源哥AI基金监控</span>
            {isWorkday ? (
              <span className="text-xs px-2 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] font-medium">交易日</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-[#9ca3af]/10 text-[#9ca3af]">休市</span>
            )}
            <span className="text-xs px-2 py-0.5 rounded bg-[#6366f1]/10 text-[#6366f1] font-medium">布局期</span>
            <span className="text-xs text-[#6b7280]">
              国庆<span className="font-mono font-medium text-[#1f2937]">{daysToNationalDay}</span>天 ·
              11月止损<span className="font-mono font-medium text-[#1f2937]">{daysToStopLoss}</span>天
            </span>
            <span className="text-xs text-[#6b7280]">
              待校准
              <span className={`font-mono font-medium ${dataQuality && !dataQuality.isStale ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {dataQuality ? `${dataQuality.fallback}/${dataQuality.total}` : '0/7'}
              </span>
            </span>
          </div>
          <span className="text-xs text-[#9ca3af] font-mono">{now}</span>
        </div>

        {/* 免责声明 */}
        <div className="bg-[#fff7ed] border-b border-[#fed7aa] px-5 py-1">
          <p className="text-xs text-[#9a3412]">
            ▲ 重要提示: 内容仅为逻辑推演复盘, 不构成任何基金、理财投资建议, 市场有波动, 入市需谨慎
          </p>
        </div>

        {/* 标签导航 */}
        <div className="flex items-center gap-1 px-5 h-9 bg-white">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#6366f1] text-white'
                  : 'text-[#4b5563] hover:bg-[#f3f4f6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => refresh()}
            className="text-xs text-[#6366f1] hover:text-[#4f46e5] font-medium"
          >
            刷新数据
          </button>
        </div>
      </header>

      {/* ===== 大盘行情行（幻灯片1关键元素）===== */}
      <div className="px-5 pt-3">
        <div className="bg-white rounded-lg border border-[#e5e7eb] px-4 py-2 flex items-center gap-6 text-sm">
          <span className="text-[#4b5563]">
            <span className="text-[#dc2626] font-bold">◆</span> 上证指数: <span className="font-mono font-medium text-[#1f2937]">--</span>
          </span>
          <span className="text-[#4b5563]">
            <span className="text-[#dc2626] font-bold">◆</span> 开盘指数: <span className="font-mono font-medium text-[#1f2937]">--</span>
          </span>
          <span className="text-[#4b5563]">
            <span className="text-[#dc2626] font-bold">◆</span> 今日主力净流入: <span className="text-xs text-[#9ca3af]">(前三名) (倒数三名)</span>
          </span>
          <span className="text-[#4b5563]">
            <span className="text-[#dc2626] font-bold">◆</span> 涨幅领先板块名称: <span className="font-mono font-medium text-[#10b981]">--</span>
          </span>
          <div className="flex-1" />
          <button className="text-xs px-3 py-1 rounded bg-[#10b981] text-white font-medium hover:bg-[#059669]">
            推送微信
          </button>
        </div>
      </div>

      {/* ===== 功能标签页内容区 ===== */}
      <div className="px-5 py-3">
        {activeTab === 'overview' && (
          <DashboardOverview funds={funds} loading={loading} />
        )}
        {activeTab === 'buy' && <BuySignalPanel funds={funds} />}
        {activeTab === 'portfolio' && <PortfolioPanel funds={funds} />}
        {activeTab === 'learning' && <LearningPanel />}
        {activeTab === 'risk' && <RiskAlertPanel />}
        {activeTab === 'command' && <CommandPanel />}
      </div>
    </div>
  );
}
