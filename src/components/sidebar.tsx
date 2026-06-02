'use client';

import { useEffect, useState } from 'react';
import { CYCLE_DATES, COMMAND_MAP, FUNDS, IS_BACKTEST_MODE } from '@/lib/constants';
import type { CommandType, SemiAnnualCycle, TabId } from '@/lib/types';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onCommand: (cmd: CommandType) => void;
  currentTime: string;
  isMarketDay: boolean;
}

const NAV_ITEMS: { id: TabId; label: string }[] = [
  { id: 'overview', label: '总览' },
  { id: 'buy', label: '买点' },
  { id: 'portfolio', label: '持仓' },
  { id: 'learning', label: '学习' },
  { id: 'risk', label: '风控' },
  { id: 'command', label: '指令' },
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
      currentAlert = '布局建仓阶段，耐心等待黄金坑/钻石坑买点';
    } else if (daysToND > 0) {
      phase = 'profit';
      phaseName = '止盈期';
      currentAlert = '国庆止盈窗口临近，分批减仓锁定收益';
    } else if (daysToNov > 30) {
      phase = 'stop';
      phaseName = '止损观察期';
      currentAlert = '已过国庆窗口，关注11月时间止损节点';
    } else {
      phase = 'final';
      phaseName = '收尾期';
      currentAlert = '11月时间止损节点，AI仓位压至20%以下';
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
    <header className="shrink-0 border-b border-border bg-sidebar-bg">
      {/* 第一行：Logo + 周期信息 + 时间 + 工具 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-foreground tracking-tight">源哥AI基金监控</h1>
            <span className="text-[11px] text-muted-foreground">每日建仓 · 全持仓预警 · 言商学习</span>
          </div>

          {/* 半年周期横排 */}
          {cycle && (
            <div className="flex items-center gap-3">
              <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                cycle.phase === 'layout' ? 'bg-indigo/20 text-indigo' :
                cycle.phase === 'profit' ? 'bg-gold/20 text-gold' :
                cycle.phase === 'stop' ? 'bg-loss/20 text-loss' :
                'bg-loss/30 text-loss'
              }`}>
                {cycle.phaseName}
              </span>
              <span className="text-xs text-muted-foreground">已运行<b className="text-foreground font-mono">{cycle.daysElapsed}</b>天</span>
              <span className="text-xs text-gold">→国庆<b className="font-mono">{cycle.daysToNationalDay}</b>天</span>
              <span className="text-xs text-loss">→11月止损<b className="font-mono">{cycle.daysToNovember}</b>天</span>
              <span className="text-xs text-muted-foreground">AI上限<b className="text-foreground font-mono">60%</b></span>
              {cycle.currentAlert && (
                <span className="text-xs text-gold/80">{cycle.currentAlert}</span>
              )}
            </div>
          )}
        </div>

        {/* 右侧工具 */}
        <div className="flex items-center gap-3">
          {/* 回测模式标识 */}
          {IS_BACKTEST_MODE && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-gold/20 text-gold font-medium">
              回测模式
            </span>
          )}
          <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
            isMarketDay ? 'bg-profit/20 text-profit' : 'bg-muted/50 text-muted-foreground'
          }`}>
            {isMarketDay ? '交易日' : '休市日'}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{currentTime}</span>

          {/* 监测标的标签 */}
          <div className="flex items-center gap-1">
            {FUNDS.slice(0, 3).map((f) => (
              <span key={f.code} className="text-[8px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground font-mono">
                {f.shortName}
              </span>
            ))}
            <span className="text-[8px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground">+5</span>
          </div>

          {/* 快捷指令下拉 */}
          <div className="relative">
            <button
              onClick={() => { setShowCommands(!showCommands); setShowPushSettings(false); }}
              className="text-xs px-2 py-1 rounded bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              快捷指令 {showCommands ? '▲' : '▼'}
            </button>
            {showCommands && (
              <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-card-bg border border-border rounded-lg shadow-xl py-1 max-h-80 overflow-y-auto">
                {quickCommands.map(([name, cmd]) => (
                  <button
                    key={name}
                    onClick={() => { onCommand(cmd.type as CommandType); setShowCommands(false); }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-sidebar-active/30 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 微信推送下拉 */}
          <div className="relative">
            <button
              onClick={() => { setShowPushSettings(!showPushSettings); setShowCommands(false); }}
              className="text-xs px-2 py-1 rounded bg-indigo/15 text-indigo hover:bg-indigo/25 transition-colors"
            >
              推送 {showPushSettings ? '▲' : '▼'}
            </button>
            {showPushSettings && (
              <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-card-bg border border-border rounded-lg shadow-xl p-3">
                <PushSettingsInline />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 第二行：标签导航 */}
      <nav className="flex items-center gap-1 px-4 py-1.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${
              activeTab === item.id
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

// 内联精简版推送设置
function PushSettingsInline() {
  const [sendKey, setSendKey] = useState('');
  const [pushplusToken, setPushplusToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('serverchan_sendkey');
    if (stored) {
      setSendKey(stored);
      setSaved(true);
    }
    const pp = localStorage.getItem('pushplus_token');
    if (pp) setPushplusToken(pp);
  }, []);

  const handleSave = () => {
    if (sendKey.trim()) {
      localStorage.setItem('serverchan_sendkey', sendKey.trim());
      setSaved(true);
      setTestResult(null);
    }
    if (pushplusToken.trim()) {
      localStorage.setItem('pushplus_token', pushplusToken.trim());
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sendKey: sendKey.trim() || undefined,
          pushplusToken: pushplusToken.trim() || undefined,
          type: 'test',
        }),
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
    <div className="space-y-2">
      <div className={`text-xs px-2 py-1 rounded ${saved ? 'text-profit bg-profit/10' : 'text-gold bg-gold/10'}`}>
        {saved ? 'Server酱已配置' : '未配置 — 填入SendKey'}
      </div>
      <div className="flex gap-1">
        <input
          type="password"
          value={sendKey}
          onChange={(e) => { setSendKey(e.target.value); setSaved(false); }}
          placeholder="SCT开头SendKey"
          className="flex-1 min-w-0 rounded border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo/50"
        />
      </div>
      <div className="text-xs text-muted-foreground mt-1">PushPlus Token（200条/天）</div>
      <input
        type="password"
        value={pushplusToken}
        onChange={(e) => setPushplusToken(e.target.value)}
        placeholder="PushPlus Token"
        className="w-full rounded border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo/50"
      />
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!sendKey.trim() && !pushplusToken.trim()} className="flex-1 rounded bg-indigo px-2 py-1 text-xs text-white hover:bg-indigo/80 disabled:opacity-40">保存</button>
        <button
          onClick={handleTest}
          disabled={(!saved && !pushplusToken.trim()) || testing}
          className="flex-1 rounded bg-profit/20 text-profit px-2 py-1 text-xs hover:bg-profit/30 disabled:opacity-40"
        >
          {testing ? '发送中...' : '测试推送'}
        </button>
      </div>
      {testResult && (
        <p className={`text-xs ${testResult.success ? 'text-profit' : 'text-loss'}`}>{testResult.message}</p>
      )}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Server酱: sct.ftqq.com · PushPlus: pushplus.plus
      </p>
    </div>
  );
}
