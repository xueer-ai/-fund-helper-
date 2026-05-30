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
  const [showPushSettings, setShowPushSettings] = useState(false);

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

      {/* 底部监测标的 + 微信推送 */}
      <div className="px-4 py-3 border-t border-border space-y-2">
        <p className="text-[10px] text-muted-foreground mb-1">监测标的 · {FUNDS.length}只</p>
        <div className="flex flex-wrap gap-1">
          {FUNDS.slice(0, 4).map((f) => (
            <span key={f.code} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-mono">
              {f.shortName}
            </span>
          ))}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">+4</span>
        </div>

        {/* 微信推送入口 */}
        <button
          onClick={() => setShowPushSettings(!showPushSettings)}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[10px] text-indigo hover:bg-indigo/10 transition-colors"
        >
          <span>微信推送设置</span>
          <span>{showPushSettings ? '▲' : '▼'}</span>
        </button>
        {showPushSettings && (
          <div className="max-h-64 overflow-y-auto">
            <PushSettingsInline />
          </div>
        )}
      </div>
    </aside>
  );
}

// 内联精简版推送设置
function PushSettingsInline() {
  const [sendKey, setSendKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('serverchan_sendkey');
    if (stored) {
      setSendKey(stored);
      setSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (sendKey.trim()) {
      localStorage.setItem('serverchan_sendkey', sendKey.trim());
      setSaved(true);
      setTestResult(null);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendKey: sendKey.trim(), type: 'test' }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.success ? '已发送，查微信' : data.error || '失败',
      });
    } catch {
      setTestResult({ success: false, message: '网络错误' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-2 pt-1 border-t border-border">
      <div className={`text-[10px] px-2 py-1 rounded ${saved ? 'text-profit bg-profit/10' : 'text-amber bg-amber/10'}`}>
        {saved ? '已配置' : '未配置 — 填入SendKey'}
      </div>
      <div className="flex gap-1">
        <input
          type="password"
          value={sendKey}
          onChange={(e) => { setSendKey(e.target.value); setSaved(false); }}
          placeholder="SCT开头SendKey"
          className="flex-1 min-w-0 rounded border border-border bg-card px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo/50"
        />
        <button onClick={handleSave} disabled={!sendKey.trim()} className="rounded bg-indigo px-2 py-1 text-[10px] text-white hover:bg-indigo/80 disabled:opacity-40">保存</button>
      </div>
      <button
        onClick={handleTest}
        disabled={!saved || testing}
        className="w-full rounded bg-profit/20 text-profit px-2 py-1 text-[10px] hover:bg-profit/30 disabled:opacity-40"
      >
        {testing ? '发送中...' : '测试推送'}
      </button>
      {testResult && (
        <p className={`text-[10px] ${testResult.success ? 'text-profit' : 'text-loss'}`}>{testResult.message}</p>
      )}
      <p className="text-[9px] text-muted-foreground leading-relaxed">
        关注公众号「Server酱」→ sct.ftqq.com 获取SendKey
      </p>
    </div>
  );
}
