'use client';

import { useState, useEffect } from 'react';
import { DISCLAIMER } from '@/lib/constants';
import type { CommandType, TabId } from '@/lib/types';
import { Sidebar } from '@/components/sidebar';
import { DashboardOverview } from '@/components/dashboard-overview';
import { BuySignalPanel } from '@/components/buy-signal-panel';
import { PortfolioPanel } from '@/components/portfolio-panel';
import { LearningPanel } from '@/components/learning-panel';
import { RiskAlertPanel } from '@/components/risk-alert-panel';
import { CommandPanel } from '@/components/command-panel';
import { useAutoMonitor } from '@/lib/hooks';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isMarketDay, setIsMarketDay] = useState(false);

  // 启动工作日自动监测 + 微信推送
  useAutoMonitor();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }));
      const day = now.getDay();
      setIsMarketDay(day >= 1 && day <= 5);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCommand = (cmd: CommandType) => {
    if (cmd === 'buy_check') setActiveTab('buy');
    else if (cmd === 'full_portfolio' || cmd === 'update_ledger' || cmd === 'holding_analysis') setActiveTab('portfolio');
    else if (cmd === 'learning' || cmd === 'learning_progress' || cmd === 'knowledge_query') setActiveTab('learning');
    else if (cmd === 'risk_overview' || cmd === 'risk_rules') setActiveTab('risk');
    else if (cmd === 'yanxuan' || cmd === 'weekly_report' || cmd === 'full_check' || cmd === 'cycle_hint') setActiveTab('command');
    else setActiveTab('command');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-deep-bg text-foreground">
      {/* 顶部横向导航栏 */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCommand={handleCommand}
        currentTime={currentTime}
        isMarketDay={isMarketDay}
      />

      {/* 免责声明条 */}
      <div className="flex items-center justify-center px-4 py-1 border-b border-border/50 bg-deep-bg/80 shrink-0">
        <p className="text-[10px] text-gold/80 tracking-wide">{DISCLAIMER}</p>
      </div>

      {/* 主内容区 - 全宽 */}
      <main className="flex-1 overflow-auto p-4">
        {activeTab === 'overview' && <DashboardOverview />}
        {activeTab === 'buy' && <BuySignalPanel />}
        {activeTab === 'portfolio' && <PortfolioPanel />}
        {activeTab === 'learning' && <LearningPanel />}
        {activeTab === 'risk' && <RiskAlertPanel />}
        {activeTab === 'command' && <CommandPanel />}
      </main>
    </div>
  );
}
