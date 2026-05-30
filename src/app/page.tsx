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

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: '总览仪表盘' },
  { id: 'buy', label: '买点检测' },
  { id: 'portfolio', label: '持仓台账' },
  { id: 'learning', label: '源哥言商学习' },
  { id: 'risk', label: '风控预警' },
  { id: 'command', label: '交互指令' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isMarketDay, setIsMarketDay] = useState(false);

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
    <div className="flex h-screen w-screen overflow-hidden bg-deep-bg text-foreground">
      {/* 侧边栏 */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCommand={handleCommand}
        currentTime={currentTime}
        isMarketDay={isMarketDay}
      />

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部免责声明 + 时间 */}
        <header className="flex items-center justify-between px-6 py-2 border-b border-border bg-deep-bg/80 backdrop-blur-sm shrink-0">
          <p className="text-xs text-amber/90 font-medium tracking-wide">{DISCLAIMER}</p>
          <div className="flex items-center gap-4">
            <span className={`text-xs px-2 py-0.5 rounded ${isMarketDay ? 'bg-profit/20 text-profit' : 'bg-muted text-muted-foreground'}`}>
              {isMarketDay ? '交易日' : '休市日'}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{currentTime}</span>
          </div>
        </header>

        {/* 标签栏 */}
        <nav className="flex items-center gap-1 px-6 py-2 border-b border-border shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'overview' && <DashboardOverview />}
          {activeTab === 'buy' && <BuySignalPanel />}
          {activeTab === 'portfolio' && <PortfolioPanel />}
          {activeTab === 'learning' && <LearningPanel />}
          {activeTab === 'risk' && <RiskAlertPanel />}
          {activeTab === 'command' && <CommandPanel />}
        </div>
      </main>
    </div>
  );
}
