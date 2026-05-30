'use client';

import { useState, useEffect, useCallback } from 'react';
import { FUNDS, CYCLE_THEORIES, IRON_RULES, DISCLAIMER } from '@/lib/constants';
import { useFundData, useScanResult, useScheduler, useNotification } from '@/lib/hooks';
import type { Fund, BuySignal, FullPositionCheck, Alert } from '@/lib/types';

export function DashboardOverview() {
  const { fundData, loading: fundLoading, lastUpdate, refresh: refreshFunds } = useFundData(true, 60000);
  const { scanResult, loading: scanLoading, rescan } = useScanResult(true, 120000);
  const scheduler = useScheduler(60000);
  const { permission, requestPermission, notify } = useNotification();

  const [prevTriggeredCount, setPrevTriggeredCount] = useState(0);
  const [prevAlertCount, setPrevAlertCount] = useState(0);

  // 买入信号
  const signals: BuySignal[] = scanResult?.signals || [];
  const triggeredSignals = scanResult?.triggeredSignals || [];
  const fullCheck: FullPositionCheck = scanResult?.fullPositionCheck || {
    consecutive3Up: false, volume15x: false, maTurnUp: false, star50Above1200: false, metCount: 0, isReady: false,
  };
  const alerts: Alert[] = scanResult?.alerts || [];

  // AI仓位计算
  const aiPosition = 45; // 华夏芯片35% + 平安半导体10% 估算

  // 新买点/新预警浏览器通知
  useEffect(() => {
    if (triggeredSignals.length > prevTriggeredCount && prevTriggeredCount >= 0) {
      const newSignals = triggeredSignals.slice(prevTriggeredCount);
      for (const s of newSignals) {
        notify('买点触发提醒', `${s.fundCode} ${s.tierName}已触发！当前净值${s.currentNav.toFixed(4)}，阈值${s.threshold}`, `buy_${s.fundCode}_${s.tier}`);
      }
    }
    setPrevTriggeredCount(triggeredSignals.length);
  }, [triggeredSignals.length, prevTriggeredCount, notify]);

  useEffect(() => {
    const redAlerts = alerts.filter((a) => a.level === 'red');
    if (redAlerts.length > 0 && redAlerts.length !== prevAlertCount) {
      for (const a of redAlerts) {
        notify('红色预警', `${a.title}: ${a.message}`, `alert_${a.id}`);
      }
    }
    setPrevAlertCount(alerts.filter((a) => a.level === 'red').length);
  }, [alerts, prevAlertCount, notify]);

  // 合并基金数据
  const mergedFundData = FUNDS.map((fund) => {
    const realtime = fundData.find((f) => f.code === fund.code);
    return {
      ...fund,
      simNav: realtime?.nav || 0,
      simChange: realtime?.change || 0,
      isRealtime: realtime?.source === 'realtime',
      updateTime: realtime?.updateTime || '',
    };
  });

  // 刷新所有数据
  const refreshAll = useCallback(() => {
    refreshFunds();
    rescan();
  }, [refreshFunds, rescan]);

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
          <p className={`text-2xl font-mono font-bold mt-1 ${triggeredSignals.length > 0 ? 'text-profit' : 'text-foreground'}`}>
            {triggeredSignals.length}
          </p>
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

      {/* 调度状态栏 */}
      <div className="bg-card-bg rounded-lg p-3 border border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
            scheduler?.isWorkday ? 'bg-profit/20 text-profit' : 'bg-muted/50 text-muted-foreground'
          }`}>
            {scheduler?.isWorkday ? '交易日' : '休市日'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            当前时段：{scheduler?.currentPeriod === 'morning_learning' ? '早间学习' :
              scheduler?.currentPeriod === 'morning_report' ? '早间播报' :
              scheduler?.currentPeriod === 'noon_review' ? '午间复习' :
              scheduler?.currentPeriod === 'afternoon_scan' ? '尾盘扫描' :
              scheduler?.currentPeriod === 'close_archive' ? '收盘归档' :
              scheduler?.currentPeriod === 'close_learning' ? '收盘学习' :
              scheduler?.currentPeriod === 'after_hours' ? '盘后' : scheduler?.currentPeriod || '--'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            半年周期：{scheduler?.cycle?.phaseName || '--'}
          </span>
          {scheduler?.cycle && (
            <span className="text-[10px] text-amber">
              距国庆止盈{scheduler.cycle.daysToNationalDay}天 · 距11月止损{scheduler.cycle.daysToNovember}天
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground">
            数据更新：{lastUpdate || '--'}
          </span>
          <button
            onClick={refreshAll}
            className="text-[10px] px-2 py-1 rounded bg-indigo/20 text-indigo hover:bg-indigo/30 transition-colors"
          >
            重新扫描
          </button>
          {permission !== 'granted' && (
            <button
              onClick={requestPermission}
              className="text-[10px] px-2 py-1 rounded bg-amber/20 text-amber hover:bg-amber/30 transition-colors"
            >
              开启通知
            </button>
          )}
        </div>
      </div>

      {/* 8只基金净值矩阵 */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">
          全量监测标的
          {fundLoading && <span className="text-[10px] text-muted-foreground ml-2">加载中...</span>}
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {mergedFundData.map((fund) => {
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
                  <div className="flex items-center gap-1">
                    {fund.isRealtime && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-profit/20 text-profit">实时</span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      fund.category === 'ai_core' ? 'bg-indigo/20 text-indigo' :
                      fund.category === 'ai_semi' ? 'bg-amber/20 text-amber' :
                      'bg-muted text-muted-foreground'
                    }`}>{categoryLabel}</span>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-mono font-bold text-foreground">
                      {fund.simNav > 0 ? fund.simNav.toFixed(fund.code === '科创50' ? 0 : 4) : '--'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {fund.code === '科创50' ? '点' : '净值'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-medium ${isUp ? 'text-profit' : 'text-loss'}`}>
                      {fund.simNav > 0 ? `${isUp ? '+' : ''}${fund.simChange}%` : '--'}
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
                        fund.simNav > 0 && fund.simNav <= fund.buyPoints.golden ? 'bg-profit/20 text-profit' : 'bg-muted/50 text-muted-foreground'
                      }`}>
                        黄金坑≤{fund.buyPoints.golden}
                      </span>
                    )}
                    {fund.buyPoints.diamond && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        fund.simNav > 0 && fund.simNav <= fund.buyPoints.diamond ? 'bg-amber/20 text-amber' : 'bg-muted/50 text-muted-foreground'
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
                    当前{s.currentNav > 0 ? s.currentNav.toFixed(4) : '--'}
                  </span>
                </div>
              </div>
            ))}
            {signals.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {scanLoading ? '扫描中...' : '暂无信号数据'}
              </p>
            )}
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
                  className={`p-3 rounded border ${
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
