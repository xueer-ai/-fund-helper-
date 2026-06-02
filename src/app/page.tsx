'use client';

import { useState, useEffect } from 'react';
import { DISCLAIMER, FUNDS, CYCLE_DATES, HOT_SECTORS, TOP_ANNUAL_FUNDS } from '@/lib/constants';
import type { CommandType, TabId, FundPriceParams } from '@/lib/types';
import { DashboardOverview } from '@/components/dashboard-overview';
import { BuySignalPanel } from '@/components/buy-signal-panel';
import { PortfolioPanel } from '@/components/portfolio-panel';
import { LearningPanel } from '@/components/learning-panel';
import { RiskAlertPanel } from '@/components/risk-alert-panel';
import { CommandPanel } from '@/components/command-panel';
import { useAutoMonitor, useFundData } from '@/lib/hooks';

const NAV_TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: '总览' },
  { id: 'buy', label: '买点' },
  { id: 'portfolio', label: '持仓' },
  { id: 'learning', label: '学习' },
  { id: 'risk', label: '风控' },
  { id: 'command', label: '指令' },
];

/** 状态灯判断 */
function getStatusLight(currentNav: number, params: FundPriceParams) {
  if (currentNav <= params.sl) return { color: 'red' as const, label: '🔴认错' };
  const slDist = (currentNav - params.sl) / params.sl * 100;
  if (slDist < 5) return { color: 'yellow' as const, label: '🟡警戒' };
  if (params.tp && currentNav >= params.tp) return { color: 'green' as const, label: '🟢可止盈' };
  return { color: 'green' as const, label: '🟢持有' };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isMarketDay, setIsMarketDay] = useState(false);
  const [fundMap, setFundMap] = useState<Record<string, { nav: number; change: number; source: string }>>({});
  const [showSectors, setShowSectors] = useState(false);

  useAutoMonitor();
  const { dataQuality, calibrated, lastUpdate } = useFundData();

  // 实时净值
  useEffect(() => {
    const fetchNav = async () => {
      try {
        const res = await fetch('/api/fund-data?all=1');
        const data = await res.json();
        const map: Record<string, { nav: number; change: number; source: string }> = {};
        if (data.funds) {
          for (const f of data.funds) {
            if (f.nav > 0) map[f.code] = { nav: f.nav, change: f.change || 0, source: f.source || '' };
          }
        }
        setFundMap(map);
      } catch { /* ignore */ }
    };
    fetchNav();
    const timer = setInterval(fetchNav, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }));
      setIsMarketDay(now.getDay() >= 1 && now.getDay() <= 5);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // 半年周期
  const now = new Date();
  const daysToND = Math.max(0, Math.ceil((CYCLE_DATES.nationalDay.getTime() - now.getTime()) / 86400000));
  const daysToNov = Math.max(0, Math.ceil((CYCLE_DATES.november.getTime() - now.getTime()) / 86400000));
  const phaseName = daysToND > 60 ? '布局期' : daysToND > 0 ? '止盈期' : daysToNov > 30 ? '止损期' : '收尾期';

  // 我的持仓（4只用户基金）
  const userHoldings = FUNDS.filter(f => f.isUserHolding);
  const portfolioRows = userHoldings.map(f => {
    const live = fundMap[f.code];
    const baseNavs: Record<string, number> = { '华夏芯片': 2.05, '平安半导体': 1.34, '宝盈转型': 4.15, '博时新能源': 1.09 };
    const currentNav = live?.nav || baseNavs[f.code] || 0;
    const change = live?.change || 0;
    const costPrice = f.priceParams?.costPrice || f.holding?.costNav || currentNav;
    const profitRate = currentNav > 0 ? ((currentNav - costPrice) / costPrice * 100) : 0;
    const status = f.priceParams ? getStatusLight(currentNav, f.priceParams) : { color: 'green' as const, label: '🟢持有' };
    const sl = f.priceParams?.sl || 0;
    const tp = f.priceParams?.tp;
    const slDist = sl > 0 && currentNav > 0 ? ((currentNav - sl) / sl * 100) : 0;
    const tpDist = tp && currentNav > 0 ? ((tp - currentNav) / currentNav * 100) : null;
    return { ...f, currentNav, change, profitRate: Number(profitRate.toFixed(2)), status, sl, tp, slDist: Number(slDist.toFixed(1)), tpDist: tpDist !== null ? Number(tpDist.toFixed(1)) : null };
  });

  // 市场情绪
  const allChanges = Object.values(fundMap).map(f => f.change);
  const upCount = allChanges.filter(c => c > 0).length;
  const downCount = allChanges.filter(c => c < 0).length;
  const sentiment = upCount > downCount + 1 ? '偏多' : downCount > upCount + 1 ? '偏空' : '震荡';
  const sentimentColor = sentiment === '偏多' ? 'text-profit' : sentiment === '偏空' ? 'text-loss' : 'text-gold';
  const sentimentEmoji = sentiment === '偏多' ? '🟢' : sentiment === '偏空' ? '🔴' : '🟡';

  // 涨跌排名
  const sortedFunds = Object.entries(fundMap)
    .filter(([, v]) => v.change !== 0)
    .sort(([, a], [, b]) => b.change - a.change);
  const topGainers = sortedFunds.slice(0, 3);
  const topLosers = sortedFunds.slice(-3).reverse();

  const handleCommand = (cmd: CommandType) => {
    if (cmd === 'buy_check') setActiveTab('buy');
    else if (cmd === 'full_portfolio' || cmd === 'update_ledger' || cmd === 'holding_analysis') setActiveTab('portfolio');
    else if (cmd === 'learning' || cmd === 'learning_progress' || cmd === 'knowledge_query') setActiveTab('learning');
    else if (cmd === 'risk_overview' || cmd === 'risk_rules') setActiveTab('risk');
    else setActiveTab('command');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-deep-bg text-foreground">
      {/* ====== 顶栏：日期 + 周期 + 校准 + 时间 ====== */}
      <header className="shrink-0 flex items-center justify-between px-5 py-2 border-b border-border bg-sidebar-bg">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-foreground">源哥AI基金监控</span>
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${isMarketDay ? 'bg-profit/20 text-profit' : 'bg-muted/50 text-muted-foreground'}`}>
            {isMarketDay ? '交易日' : '休市'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
            phaseName === '布局期' ? 'bg-indigo/20 text-indigo' :
            phaseName === '止盈期' ? 'bg-gold/20 text-gold' : 'bg-loss/20 text-loss'
          }`}>{phaseName}</span>
          <span className="text-xs text-muted-foreground">国庆<b className="text-gold font-mono">{daysToND}</b>天 · 11月止损<b className="text-loss font-mono">{daysToNov}</b>天</span>
          {dataQuality && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              dataQuality.isStale ? 'bg-loss/20 text-loss' : calibrated ? 'bg-profit/20 text-profit' : 'bg-gold/20 text-gold'
            }`}>
              {dataQuality.isStale ? '待校准' : calibrated ? '已校准' : '实时'} {dataQuality.realtime}/{dataQuality.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">{currentTime}</span>
        </div>
      </header>

      {/* 免责声明 */}
      <div className="flex items-center justify-center px-4 py-0.5 border-b border-border/30 bg-deep-bg/80 shrink-0">
        <p className="text-[11px] text-gold/70 tracking-wide">{DISCLAIMER}</p>
      </div>

      {/* ====== 第一区：大盘概览（参考PPT首页） ====== */}
      <section className="shrink-0 px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-5 flex-wrap">
          {/* 市场情绪灯 */}
          <div className="flex items-center gap-2">
            <span className="text-xl">{sentimentEmoji}</span>
            <div>
              <p className={`text-sm font-bold ${sentimentColor}`}>{sentiment}</p>
              <p className="text-[11px] text-muted-foreground">{upCount}涨/{downCount}跌</p>
            </div>
          </div>
          <div className="w-px h-8 bg-border" />

          {/* 主力净流入：涨幅前3 */}
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">涨幅前3</p>
            <div className="flex items-center gap-2">
              {topGainers.map(([code, v]) => {
                const fund = FUNDS.find(f => f.code === code);
                return (
                  <span key={code} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{fund?.shortName || code}</span>
                    <span className="text-xs font-mono font-bold text-profit">
                      +{v.change.toFixed(2)}%
                    </span>
                  </span>
                );
              })}
              {topGainers.length === 0 && <span className="text-xs text-muted-foreground">--</span>}
            </div>
          </div>
          <div className="w-px h-8 bg-border" />

          {/* 主力净流出：跌幅前3 */}
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">跌幅前3</p>
            <div className="flex items-center gap-2">
              {topLosers.map(([code, v]) => {
                const fund = FUNDS.find(f => f.code === code);
                return (
                  <span key={code} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{fund?.shortName || code}</span>
                    <span className="text-xs font-mono font-bold text-loss">
                      {v.change.toFixed(2)}%
                    </span>
                  </span>
                );
              })}
              {topLosers.length === 0 && <span className="text-xs text-muted-foreground">--</span>}
            </div>
          </div>
          <div className="w-px h-8 bg-border" />

          {/* 涨幅领先板块 */}
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">涨幅领先板块</p>
            <div className="flex items-center gap-2">
              {HOT_SECTORS.slice(0, 2).map(s => (
                <span key={s.rank} className="text-xs px-1.5 py-0.5 rounded bg-profit/10 text-profit border border-profit/20">
                  {s.name.split('（')[0]}
                </span>
              ))}
              <button
                onClick={() => setShowSectors(!showSectors)}
                className="text-xs text-indigo hover:text-indigo/80 underline"
              >
                TOP5 {showSectors ? '收起' : '展开'}
              </button>
            </div>
          </div>
          <div className="w-px h-8 bg-border" />

          {/* AI仓位 + 买点/预警 */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground">AI仓位</p>
              <p className="text-lg font-mono font-bold text-gold">45%</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">买点</p>
              <p className="text-sm font-mono font-bold text-muted-foreground">0</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">预警</p>
              <p className="text-sm font-mono font-bold text-muted-foreground">0</p>
            </div>
          </div>
        </div>

        {/* 热门板块TOP5累计统计（可展开/收起） */}
        {showSectors && (
          <div className="mt-3 p-3 rounded-lg bg-card-bg border border-border">
            <h3 className="text-xs font-bold text-foreground mb-2">入围涨幅板块TOP5次数（2026年1月起累计）</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-1.5 px-2 font-medium w-8">#</th>
                  <th className="text-left py-1.5 px-2 font-medium">板块</th>
                  <th className="text-center py-1.5 px-2 font-medium">入围次数</th>
                  <th className="text-left py-1.5 px-2 font-medium">月份</th>
                  <th className="text-left py-1.5 px-2 font-medium">核心驱动</th>
                  <th className="text-left py-1.5 px-2 font-medium">代表基金</th>
                </tr>
              </thead>
              <tbody>
                {HOT_SECTORS.map(s => (
                  <tr key={s.rank} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="py-1.5 px-2 font-mono text-gold font-bold">{s.rank}</td>
                    <td className="py-1.5 px-2 font-medium text-foreground">{s.name}</td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-profit">{s.times}次</td>
                    <td className="py-1.5 px-2 text-muted-foreground">{s.months}</td>
                    <td className="py-1.5 px-2 text-muted-foreground">{s.driver}</td>
                    <td className="py-1.5 px-2 text-indigo text-[11px]">{s.funds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* 年度涨幅领先主动基金 */}
            <h3 className="text-xs font-bold text-foreground mt-3 mb-1.5">年度涨幅领先主动基金（截至2026.5.31）</h3>
            <div className="flex items-center gap-4">
              {TOP_ANNUAL_FUNDS.map(f => (
                <span key={f.name} className="text-xs px-2 py-1 rounded bg-gold/10 border border-gold/20">
                  <span className="text-foreground font-medium">{f.name}</span>
                  <span className="text-profit font-mono font-bold ml-1">+{f.ytd}%</span>
                  <span className="text-muted-foreground ml-1">{f.note}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ====== 第二区：我的持仓（表格） ====== */}
      <section className="shrink-0 px-5 py-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-foreground">我的持仓</h2>
          <span className="text-[11px] text-muted-foreground">成本/止损/止盈均为参考线，不构成投资建议</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="text-left py-1.5 px-2 font-medium">基金</th>
                <th className="text-right py-1.5 px-2 font-medium">当前净值</th>
                <th className="text-right py-1.5 px-2 font-medium">今日涨跌</th>
                <th className="text-right py-1.5 px-2 font-medium">成本价</th>
                <th className="text-right py-1.5 px-2 font-medium">浮盈亏</th>
                <th className="text-center py-1.5 px-2 font-medium">状态</th>
                <th className="text-right py-1.5 px-2 font-medium">止损线</th>
                <th className="text-right py-1.5 px-2 font-medium">止盈线</th>
                <th className="text-right py-1.5 px-2 font-medium">距止损</th>
                <th className="text-right py-1.5 px-2 font-medium">距止盈</th>
                <th className="text-left py-1.5 px-2 font-medium">角色</th>
              </tr>
            </thead>
            <tbody>
              {portfolioRows.map(row => (
                <tr key={row.code} className={`border-b border-border/20 hover:bg-card-bg/50 ${
                  row.status.color === 'red' ? 'bg-loss/5' : row.status.color === 'yellow' ? 'bg-gold/5' : ''
                }`}>
                  <td className="py-2 px-2">
                    <span className="font-medium text-foreground">{row.shortName}</span>
                    <span className="text-muted-foreground ml-1 font-mono">{row.code}</span>
                  </td>
                  <td className="text-right py-2 px-2 font-mono font-bold text-foreground">
                    {row.currentNav > 0 ? row.currentNav.toFixed(4) : '--'}
                  </td>
                  <td className={`text-right py-2 px-2 font-mono font-bold ${row.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {row.currentNav > 0 ? `${row.change >= 0 ? '+' : ''}${row.change.toFixed(2)}%` : '--'}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-blue-400">
                    {row.priceParams?.costPrice?.toFixed(4) || '--'}
                  </td>
                  <td className={`text-right py-2 px-2 font-mono font-bold ${row.profitRate >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {row.currentNav > 0 ? `${row.profitRate >= 0 ? '+' : ''}${row.profitRate}%` : '--'}
                  </td>
                  <td className="text-center py-2 px-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      row.status.color === 'red' ? 'bg-loss/20 text-loss' :
                      row.status.color === 'yellow' ? 'bg-gold/20 text-gold' : 'bg-profit/20 text-profit'
                    }`}>{row.status.label}</span>
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-loss/80">
                    {row.sl > 0 ? row.sl.toFixed(4) : '--'}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-purple-400">
                    {row.tp ? row.tp.toFixed(4) : '--'}
                  </td>
                  <td className={`text-right py-2 px-2 font-mono ${row.slDist < 5 ? 'text-loss' : 'text-muted-foreground'}`}>
                    {row.slDist > 0 ? `${row.slDist}%` : '--'}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-muted-foreground">
                    {row.tpDist !== null ? `${row.tpDist}%` : '--'}
                  </td>
                  <td className="text-left py-2 px-2 text-muted-foreground">
                    {row.priceParams?.role || '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ====== 第三区：标签导航 + 内容 ====== */}
      <nav className="shrink-0 flex items-center gap-1 px-5 py-1.5 border-b border-border bg-sidebar-bg">
        {NAV_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo/20 text-indigo font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

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
