'use client';

import { useEffect, useState } from 'react';
import { CYCLE_DATES, COMMAND_MAP, FUNDS } from '@/lib/constants';
import type { CommandType, SemiAnnualCycle, TabId } from '@/lib/types';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onCommand: (cmd: CommandType) => void;
  currentTime: string;
  isMarketDay: boolean;
}

const NAV_ITEMS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: '总览仪表盘', icon: '◈' },
  { id: 'buy', label: '买点检测', icon: '◉' },
  { id: 'portfolio', label: '持仓台账', icon: '▤' },
  { id: 'learning', label: '源哥言商学习', icon: '◈' },
  { id: 'risk', label: '风控预警', icon: '◈' },
  { id: 'command', label: '交互指令', icon: '◈' },
];

export function Sidebar({ activeTab, onTabChange, onCommand, currentTime, isMarketDay }: SidebarProps) {
  const [cycle, setCycle] = useState<SemiAnnualCycle | null>(null);
  const [showCommands, setShowCommands] = useState(false);

  useEffect(() => {
    const now = new Date();
    const start = CYCLE_DATES.start;
    const nationalDay = CYCLE_DATES.nationalDay;
    const november = CYCLE_DATES.november;

    const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysToND = Math.max(0, Math.ceil((nationalDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const daysToNov = Math.max(0, Math.ceil((november.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    let phase: SemiAnnualCycle['phase'] = 'layout';
    let phaseName = '布局期';
    let currentAlert = '';

    if (daysToND > 60) {
      phase = 'layout';
      phaseName = '布局期';
      currentAlert = '当前处于布局建仓阶段，耐心等待黄金坑/钻石坑买点';
    } else if (daysToND > 0) {
      phase = 'profit';
      phaseName = '止盈期';
      currentAlert = '国庆止盈窗口临近，华夏芯片分批减仓锁定收益';
    } else if (daysToNov > 30) {
      phase = 'stop';
      phaseName = '止损观察期';
      currentAlert = '已过国庆窗口，关注11月时间止损节点';
    } else {
      phase = 'final';
      phaseName = '收尾期';
      currentAlert = '11月时间止损节点，AI仓位压至20%以下，非AI全清';
    }

    setCycle({
      startDate: start.toISOString().split('T')[0],
      phase,
      phaseName,
      daysElapsed: Math.max(0, daysElapsed),
      daysToNationalDay: daysToND,
      daysToNovember: daysToNov,
      currentAlert,
    });
  }, []);

  const quickCommands = Object.entries(COMMAND_MAP).slice(0, 8);

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-border bg-sidebar-bg overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <h1 className="text-sm font-bold text-foreground tracking-tight">源哥AI基金监控</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">每日建仓 · 全持仓预警 · 言商学习</p>
      </div>

      {/* 半年周期倒计时 */}
      {cycle && (
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">半年周期</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              cycle.phase === 'layout' ? 'bg-indigo/20 text-indigo' :
              cycle.phase === 'profit' ? 'bg-amber/20 text-amber' :
              cycle.phase === 'stop' ? 'bg-loss/20 text-loss' :
              'bg-loss/30 text-loss'
            }`}>
              {cycle.phaseName}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-muted-foreground">已运行</span>
              <p className="text-foreground font-mono font-medium">{cycle.daysElapsed}天</p>
            </div>
            <div>
              <span className="text-muted-foreground">→国庆止盈</span>
              <p className="text-amber font-mono font-medium">{cycle.daysToNationalDay}天</p>
            </div>
            <div>
              <span className="text-muted-foreground">→11月止损</span>
              <p className="text-loss font-mono font-medium">{cycle.daysToNovember}天</p>
            </div>
            <div>
              <span className="text-muted-foreground">AI仓位上限</span>
              <p className="text-foreground font-mono font-medium">60%</p>
            </div>
          </div>
          <p className="text-[10px] text-amber/80 mt-2 leading-relaxed">{cycle.currentAlert}</p>
        </div>
      )}

      {/* 导航 */}
      <nav className="flex-1 overflow-auto px-2 py-2">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                activeTab === item.id
                  ? 'bg-sidebar-active text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-active/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 快捷指令 */}
        <div className="mt-4 pt-3 border-t border-border">
          <button
            onClick={() => setShowCommands(!showCommands)}
            className="w-full text-left px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            快捷指令 {showCommands ? '▲' : '▼'}
          </button>
          {showCommands && (
            <div className="space-y-0.5 mt-1">
              {quickCommands.map(([name, cmd]) => (
                <button
                  key={name}
                  onClick={() => onCommand(cmd.type as CommandType)}
                  className="w-full text-left px-3 py-1.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-sidebar-active/30 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* 底部监测标的 */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground mb-1">监测标的 · {FUNDS.length}只</p>
        <div className="flex flex-wrap gap-1">
          {FUNDS.slice(0, 4).map((f) => (
            <span key={f.code} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-mono">
              {f.shortName}
            </span>
          ))}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">+4</span>
        </div>
      </div>
    </aside>
  );
}
