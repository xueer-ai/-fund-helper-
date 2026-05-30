'use client';

import { useState, useEffect } from 'react';
import { FUNDS, CYCLE_THEORIES, IRON_RULES, DISCLAIMER } from '@/lib/constants';
import type { Fund, BuySignal, FullPositionCheck, Alert, AlertLevel } from '@/lib/types';

// 生成模拟净值数据
function generateSimNav(fund: Fund): number {
  const baseNavs: Record<string, number> = {
    '159140': 1.42,
    '159142': 1.38,
    '022364': 5.95,
    '华夏芯片': 1.85,
    '平安半导体': 0.89,
    '宝盈转型': 2.15,
    '博时新能源': 1.05,
    '科创50': 1050,
  };
  const base = baseNavs[fund.code] || 1.0;
  const fluctuation = (Math.random() - 0.5) * 0.02;
  return Number((base * (1 + fluctuation)).toFixed(4));
}

function generateSimChange(): number {
  return Number(((Math.random() - 0.45) * 4).toFixed(2));
}

export function DashboardOverview() {
  const [fundData, setFundData] = useState<Array<Fund & { simNav: number; simChange: number }>>([]);
  const [signals, setSignals] = useState<BuySignal[]>([]);
  const [fullCheck, setFullCheck] = useState<FullPositionCheck>({
    consecutive3Up: false,
    volume15x: false,
    maTurnUp: false,
    star50Above1200: false,
    metCount: 0,
    isReady: false,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [aiPosition, setAiPosition] = useState(0);

  useEffect(() => {
    // 生成模拟数据
    const data = FUNDS.map((f) => ({
      ...f,
      simNav: generateSimNav(f),
      simChange: generateSimChange(),
    }));
    setFundData(data);

    // 检测买入信号
    const newSignals: BuySignal[] = [];
    FUNDS.forEach((f) => {
      if (f.buyPoints?.golden) {
        const nav = data.find((d) => d.code === f.code)?.simNav || 0;
        newSignals.push({
          fundCode: f.code,
          tier: 1,
          tierName: '黄金坑',
          threshold: f.buyPoints.golden,
          currentNav: nav,
          isTriggered: nav <= f.buyPoints.golden,
          positionRatio: '12%',
          description: `${f.shortName}净值≤${f.buyPoints.golden}，回调约20%`,
          knowledgeLink: '分批建仓铁律',
        });
      }
      if (f.buyPoints?.diamond) {
        const nav = data.find((d) => d.code === f.code)?.simNav || 0;
        newSignals.push({
          fundCode: f.code,
          tier: 2,
          tierName: '钻石坑',
          threshold: f.buyPoints.diamond,
          currentNav: nav,
          isTriggered: nav <= f.buyPoints.diamond,
          positionRatio: '12%',
          description: `${f.shortName}净值≤${f.buyPoints.diamond}，回调约25%`,
          knowledgeLink: '历史极端行情应对',
        });
      }
    });
    setSignals(newSignals);

    // 满仓条件
    const check: FullPositionCheck = {
      consecutive3Up: Math.random() > 0.7,
      volume15x: Math.random() > 0.8,
      maTurnUp: Math.random() > 0.6,
      star50Above1200: (data.find((d) => d.code === '科创50')?.simNav || 0) > 1200,
      metCount: 0,
      isReady: false,
    };
    check.metCount = [check.consecutive3Up, check.volume15x, check.maTurnUp, check.star50Above1200].filter(Boolean).length;
    check.isReady = check.metCount >= 2;
    setFullCheck(check);

    // AI仓位
    const chipWeight = 35;
    const pingAnWeight = 10;
    setAiPosition(chipWeight + pingAnWeight);

    // 预警
    const newAlerts: Alert[] = [];
    const pingAn = data.find((d) => d.code === '平安半导体');
    if (pingAn && Math.abs(pingAn.simChange) > 3) {
      newAlerts.push({
        id: 'a1',
        level: 'yellow',
        title: '平安半导体波动预警',
        message: `单日波动${pingAn.simChange}%，浮亏接近20%警戒线`,
        fundCode: '平安半导体',
        timestamp: new Date(),
        action: '暂停加仓，科创50破1200减仓50%',
        knowledgeLink: '价格止损铁律',
      });
    }
    if (aiPosition > 55) {
      newAlerts.push({
        id: 'a2',
        level: 'normal',
        title: 'AI仓位逼近上限',
        message: `当前AI仓位占比约${aiPosition}%，距60%上限仅${60 - aiPosition}%`,
        timestamp: new Date(),
        action: '暂不加仓AI赛道基金',
        knowledgeLink: '仓位管理原则',
      });
    }
    setAlerts(newAlerts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggeredSignals = signals.filter((s) => s.isTriggered);
  const userHoldings = fundData.filter((f) => f.isUserHolding);

  return (
    <div className="space-y-6">
      {/* 顶部概览卡 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card-bg rounded-lg p-4 border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AI主线仓位</p>
          <p className="text-2xl font-mono font-bold text-amber mt-1">{aiPosition}%</p>
          <p className="text-[10px] text-muted-foreground mt-1">上限60% · 余量{60 - aiPosition}%</p>
        </div>
        <div className="bg-card-bg rounded-lg p-4 border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">触发买点</p>
          <p className="text-2xl font-mono font-bold text-profit mt-1">{triggeredSignals.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">共{signals.length}个监测阈值</p>
        </div>
        <div className="bg-card-bg rounded-lg p-4 border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">满仓条件</p>
          <p className="text-2xl font-mono font-bold text-indigo mt-1">{fullCheck.metCount}/4</p>
          <p className="text-[10px] text-muted-foreground mt-1">{fullCheck.isReady ? '≥2项达标可满仓' : '未达标'}</p>
        </div>
        <div className="bg-card-bg rounded-lg p-4 border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">活跃预警</p>
          <p className={`text-2xl font-mono font-bold mt-1 ${
            alerts.some((a) => a.level === 'red') ? 'text-loss' :
            alerts.some((a) => a.level === 'yellow') ? 'text-amber' : 'text-profit'
          }`}>{alerts.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {alerts.filter((a) => a.level === 'red').length}红 · {alerts.filter((a) => a.level === 'yellow').length}黄 · {alerts.filter((a) => a.level === 'normal').length}常规
          </p>
        </div>
      </div>

      {/* 8只基金净值矩阵 */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">全量监测标的</h2>
        <div className="grid grid-cols-4 gap-3">
          {fundData.map((fund) => {
            const isUp = fund.simChange >= 0;
            const isUserFund = fund.isUserHolding;
            const categoryLabel = fund.category === 'ai_core' ? 'AI核心' :
              fund.category === 'ai_semi' ? 'AI半导体' :
              fund.category === 'backup' ? '备用金' :
              fund.category === 'non_ai' ? '非AI' : '指数';
            return (
              <div
                key={fund.code}
                className={`bg-card-bg rounded-lg p-3 border transition-colors ${
                  isUserFund ? 'border-amber/30' : 'border-border'
                } hover:bg-card-bg-hover`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium text-foreground">{fund.shortName}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">{fund.code}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    fund.category === 'ai_core' ? 'bg-indigo/20 text-indigo' :
                    fund.category === 'ai_semi' ? 'bg-amber/20 text-amber' :
                    fund.category === 'backup' ? 'bg-muted text-muted-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>{categoryLabel}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-mono font-bold text-foreground">{fund.simNav.toFixed(fund.code === '科创50' ? 0 : 4)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {fund.code === '科创50' ? '点' : '净值'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-medium ${isUp ? 'text-profit' : 'text-loss'}`}>
                      {isUp ? '+' : ''}{fund.simChange}%
                    </p>
                    {isUserFund && fund.holding && (
                      <p className={`text-[10px] font-mono ${
                        fund.holding.profitRate >= 0 ? 'text-profit' : 'text-loss'
                      }`}>
                        浮盈{fund.holding.profitRate >= 0 ? '+' : ''}{fund.holding.profitRate}%
                      </p>
                    )}
                  </div>
                </div>
                {/* 买点标记 */}
                {fund.buyPoints && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                    {fund.buyPoints.golden && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        fund.simNav <= fund.buyPoints.golden ? 'bg-profit/20 text-profit' : 'bg-muted/50 text-muted-foreground'
                      }`}>
                        黄金坑≤{fund.buyPoints.golden}
                      </span>
                    )}
                    {fund.buyPoints.diamond && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        fund.simNav <= fund.buyPoints.diamond ? 'bg-amber/20 text-amber' : 'bg-muted/50 text-muted-foreground'
                      }`}>
                        钻石坑≤{fund.buyPoints.diamond}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 下方两栏：信号+预警 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 买入信号摘要 */}
        <div className="bg-card-bg rounded-lg p-4 border border-border">
          <h3 className="text-xs font-medium text-foreground mb-3">买入信号检测</h3>
          <div className="space-y-2">
            {signals.map((s, i) => (
              <div key={i} className={`flex items-center justify-between p-2 rounded ${
                s.isTriggered ? 'bg-profit/10 border border-profit/30' : 'bg-muted/20'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.isTriggered ? 'bg-profit' : 'bg-muted-foreground/30'}`} />
                  <span className="text-xs text-foreground">{s.fundCode} · {s.tierName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground font-mono">阈值{s.threshold}</span>
                  <span className="text-[10px] text-muted-foreground mx-1">|</span>
                  <span className={`text-[10px] font-mono ${s.isTriggered ? 'text-profit' : 'text-muted-foreground'}`}>
                    当前{s.currentNav.toFixed(4)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 预警面板 */}
        <div className="bg-card-bg rounded-lg p-4 border border-border">
          <h3 className="text-xs font-medium text-foreground mb-3">风控预警</h3>
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">当前无预警</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded border alert-slide-in ${
                    alert.level === 'red' ? 'border-loss/50 bg-loss/10' :
                    alert.level === 'yellow' ? 'border-amber/50 bg-amber/10' :
                    'border-profit/30 bg-profit/5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      alert.level === 'red' ? 'bg-loss/30 text-loss' :
                      alert.level === 'yellow' ? 'bg-amber/30 text-amber' :
                      'bg-profit/20 text-profit'
                    }`}>
                      {alert.level === 'red' ? '三级红色' : alert.level === 'yellow' ? '二级黄色' : '一级常规'}
                    </span>
                    <span className="text-xs font-medium text-foreground">{alert.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{alert.message}</p>
                  <p className="text-[10px] text-amber mt-1">处置：{alert.action}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 三大周期 + 铁律 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card-bg rounded-lg p-4 border border-border">
          <h3 className="text-xs font-medium text-foreground mb-3">源哥三大周期理论</h3>
          <div className="space-y-3">
            {CYCLE_THEORIES.map((ct) => (
              <div key={ct.id} className="p-2 rounded bg-muted/20">
                <p className="text-xs font-medium text-indigo">{ct.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{ct.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber/20 text-amber">
                    当前：{ct.currentPhase}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card-bg rounded-lg p-4 border border-border">
          <h3 className="text-xs font-medium text-foreground mb-3">今日铁律复习</h3>
          <div className="space-y-2">
            {IRON_RULES.slice(0, 3).map((rule) => (
              <div key={rule.id} className="p-2 rounded bg-muted/20">
                <p className="text-xs font-medium text-foreground">{rule.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{rule.content}</p>
              </div>
            ))}
            <p className="text-[10px] text-indigo mt-2">完整7条铁律请在"源哥言商学习"模块查看</p>
          </div>
        </div>
      </div>
    </div>
  );
}
