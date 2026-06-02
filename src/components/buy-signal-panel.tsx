'use client';

import { useState, useEffect, useCallback } from 'react';
import { DISCLAIMER, FUNDS } from '@/lib/constants';
import { useFundData, useScanResult } from '@/lib/hooks';
import type { BuySignal, FullPositionCheck } from '@/lib/types';

export function BuySignalPanel() {
  const { fundData, lastUpdate, refresh: refreshFunds } = useFundData(true, 60000);
  const { scanResult, loading, rescan } = useScanResult(true, 120000);
  const [lastScan, setLastScan] = useState('');

  const signals: BuySignal[] = scanResult?.signals || [];
  const fullCheck: FullPositionCheck = scanResult?.fullPositionCheck || {
    consecutive3Up: false, volume15x: false, maTurnUp: false, star50Above1200: false, metCount: 0, isReady: false,
  };

  // 从基金数据中获取科创50
  const star50Fund = fundData.find((f) => f.code === '科创50');
  const star50 = star50Fund?.nav || 1050;

  // 基金代码→名称映射
  const fundNameMap: Record<string, string> = {};
  FUNDS.forEach((f) => { fundNameMap[f.code] = f.name; });

  const doScan = useCallback(() => {
    const now = new Date();
    setLastScan(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    refreshFunds();
    rescan();
  }, [refreshFunds, rescan]);

  useEffect(() => {
    doScan();
  }, [doScan]);

  const tierColors: Record<number, string> = {
    1: 'border-gold/40 bg-gold/5',
    2: 'border-profit/40 bg-profit/5',
    3: 'border-indigo/40 bg-indigo/5',
  };

  const tierBadgeColors: Record<number, string> = {
    1: 'bg-gold/20 text-gold',
    2: 'bg-profit/20 text-profit',
    3: 'bg-indigo/20 text-indigo',
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gold/90 font-medium">{DISCLAIMER}</p>

      {/* 扫描控制 */}
      <div className="flex items-center justify-between bg-card-bg rounded-lg p-5 border border-border">
        <div>
          <h2 className="text-base font-medium text-foreground">三档买点实时检测</h2>
          <p className="text-xs text-muted-foreground mt-1">
            上次扫描：{lastScan || scanResult?.scanTime?.split('T')[1]?.split('.')[0] || '待扫描'}
            {lastUpdate && <span className="ml-3">数据更新：{lastUpdate}</span>}
          </p>
        </div>
        <button
          onClick={doScan}
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? '扫描中...' : '重新扫描'}
        </button>
      </div>

      {/* 三档信号 */}
      {[1, 2, 3].map((tier) => {
        const tierSignals = signals.filter((s) => s.tier === tier);
        if (tierSignals.length === 0) return null;
        const tierTitle = tier === 1 ? '第一档：黄金坑' : tier === 2 ? '第二档：钻石坑' : '第三档：企稳满仓';
        return (
          <div key={tier} className={`rounded-lg p-5 border ${tierColors[tier]}`}>
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs px-2.5 py-1 rounded font-medium ${tierBadgeColors[tier]}`}>
                第{tier}档
              </span>
              <h3 className="text-base font-medium text-foreground">{tierTitle}</h3>
            </div>
            <div className="space-y-3">
              {tierSignals.map((s, i) => (
                <div key={i} className={`p-4 rounded bg-card-bg border ${
                  s.isTriggered ? 'border-profit/50' : 'border-border'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3 h-3 rounded-full ${s.isTriggered ? 'bg-profit animate-pulse' : 'bg-muted-foreground/30'}`} />
                      <span className="text-sm font-medium text-foreground">
                        {s.fundName || fundNameMap[s.fundCode] || s.fundCode}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">{s.fundCode}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        s.tierName.includes('黄金') ? 'bg-gold/20 text-gold' :
                        s.tierName.includes('钻石') ? 'bg-profit/20 text-profit' :
                        'bg-indigo/20 text-indigo'
                      }`}>
                        {s.tierName}
                      </span>
                    </div>
                    {s.isTriggered && (
                      <span className="text-xs px-2.5 py-1 rounded bg-profit/20 text-profit font-medium animate-pulse">
                        已触发
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                  <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border/50">
                    {s.threshold > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">阈值</span>
                        <p className="text-sm font-mono text-gold">{s.threshold}</p>
                      </div>
                    )}
                    {s.currentNav > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">当前净值</span>
                        <p className={`text-sm font-mono ${s.isTriggered ? 'text-profit' : 'text-foreground'}`}>
                          {s.currentNav.toFixed(4)}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-muted-foreground">建议仓位</span>
                      <p className="text-sm font-mono text-foreground">{s.positionRatio}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">知识点</span>
                      <p className="text-sm text-indigo">{s.knowledgeLink}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* 满仓企稳4项指标 */}
      <div className="bg-card-bg rounded-lg p-5 border border-border">
        <h3 className="text-base font-medium text-foreground mb-4">满仓企稳条件复核（≥2项达标）</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { key: 'consecutive3Up', label: '连3阳线', val: fullCheck.consecutive3Up },
            { key: 'volume15x', label: '成交量1.5x', val: fullCheck.volume15x },
            { key: 'maTurnUp', label: '5/3日均线拐头', val: fullCheck.maTurnUp },
            { key: 'star50Above1200', label: '科创50站稳1200', val: fullCheck.star50Above1200 },
          ].map((item) => (
            <div key={item.key} className={`p-4 rounded border text-center ${
              item.val ? 'border-profit/50 bg-profit/5' : 'border-border bg-muted/10'
            }`}>
              <span className={`text-xl ${item.val ? 'text-profit' : 'text-muted-foreground/40'}`}>
                {item.val ? '✓' : '✗'}
              </span>
              <p className="text-xs text-muted-foreground mt-2">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">达标项数</span>
            <span className={`text-base font-mono font-bold ${fullCheck.isReady ? 'text-profit' : 'text-gold'}`}>
              {fullCheck.metCount}/4 {fullCheck.isReady ? '✓ 可满仓' : '(需≥2项)'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">科创50当前：<span className="font-mono text-foreground">{star50 > 0 ? star50.toFixed(0) : '--'}</span> 点</p>
        </div>
      </div>

      {/* 追高拦截提示 */}
      <div className="bg-loss/5 rounded-lg p-5 border border-loss/30">
        <h3 className="text-sm font-medium text-loss mb-3">追高拦截铁律</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• 159140（科创AI）{'>'} 1.37 → 劝阻一切新开仓</p>
          <p>• 022364（永赢科技）{'>'} 5.68 → 劝阻一切新开仓（含自有基金腾挪资金）</p>
          <p>• 关联学习：追高是亏损根源</p>
        </div>
      </div>
    </div>
  );
}
