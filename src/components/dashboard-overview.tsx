'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FUNDS, CYCLE_THEORIES, IRON_RULES } from '@/lib/constants';
import { useFundData, useScanResult, useNotification } from '@/lib/hooks';
import type { BuySignal, FullPositionCheck, Alert } from '@/lib/types';

// K线数据点
interface KLinePoint {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export function DashboardOverview() {
  const { fundData, loading: fundLoading, lastUpdate, refresh: refreshFunds } = useFundData(true, 60000);
  const { scanResult, loading: scanLoading, rescan } = useScanResult(true, 120000);
  const { permission, requestPermission, notify } = useNotification();

  const [prevTriggeredCount, setPrevTriggeredCount] = useState(0);
  const [prevAlertCount, setPrevAlertCount] = useState(0);
  const [selectedFund, setSelectedFund] = useState<string>('');
  const chartRef = useRef<HTMLCanvasElement>(null);

  const signals: BuySignal[] = scanResult?.signals || [];
  const triggeredSignals = scanResult?.triggeredSignals || [];
  const fullCheck: FullPositionCheck = scanResult?.fullPositionCheck || {
    consecutive3Up: false, volume15x: false, maTurnUp: false, star50Above1200: false, metCount: 0, isReady: false,
  };
  const alerts: Alert[] = scanResult?.alerts || [];

  // 合并数据
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

  // 浏览器通知
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

  // K线数据
  const generateKLineData = useCallback((fundCode: string, currentNav: number): KLinePoint[] => {
    if (currentNav <= 0) return [];
    const data: KLinePoint[] = [];
    const baseNav = currentNav;
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const fluctuation = (Math.sin(i * 0.3) * 0.03 + Math.cos(i * 0.7) * 0.02) * baseNav;
      const open = baseNav + fluctuation;
      const close = open + (Math.sin(i * 0.5) * 0.015 * baseNav);
      const high = Math.max(open, close) + Math.abs(fluctuation) * 0.3;
      const low = Math.min(open, close) - Math.abs(fluctuation) * 0.3;
      data.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        open: Number(open.toFixed(4)),
        close: Number(close.toFixed(4)),
        high: Number(high.toFixed(4)),
        low: Number(low.toFixed(4)),
        volume: Math.round(1000 + Math.abs(fluctuation) * 5000),
      });
    }
    return data;
  }, []);

  const selectedFundData = mergedFundData.find((f) => f.code === selectedFund) || mergedFundData[0];
  const klineData = selectedFundData ? generateKLineData(selectedFundData.code, selectedFundData.simNav) : [];

  // 买点阈值
  const buyThresholds: { value: number; label: string; type: 'golden' | 'diamond' }[] = [];
  if (selectedFundData?.buyPoints?.golden) {
    buyThresholds.push({ value: selectedFundData.buyPoints.golden, label: '黄金坑', type: 'golden' });
  }
  if (selectedFundData?.buyPoints?.diamond) {
    buyThresholds.push({ value: selectedFundData.buyPoints.diamond, label: '钻石坑', type: 'diamond' });
  }

  // 绘制K线图
  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas || klineData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 60, bottom: 25, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const allPrices = klineData.flatMap((d) => [d.high, d.low]);
    buyThresholds.forEach((t) => allPrices.push(t.value));
    const minPrice = Math.min(...allPrices) * 0.998;
    const maxPrice = Math.max(...allPrices) * 1.002;
    const priceRange = maxPrice - minPrice;

    const yScale = (price: number) => padding.top + chartH * (1 - (price - minPrice) / priceRange);
    const barWidth = Math.max(2, (chartW / klineData.length) * 0.6);
    const gap = chartW / klineData.length;

    // 网格线
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      const price = maxPrice - (priceRange / 4) * i;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(4), w - padding.right + 4, y + 3);
    }

    // 买点阈值线
    buyThresholds.forEach((t) => {
      const y = yScale(t.value);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = t.type === 'golden' ? '#d4a843' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = t.type === 'golden' ? '#d4a843' : '#ef4444';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${t.label} ${t.value}`, w - padding.right + 4, y - 4);
    });

    // 用户持仓关键价位线
    const fundForPP = FUNDS.find(f => f.code === selectedFundData?.code);
    const pp = fundForPP?.priceParams;
    if (pp) {
      const priceLines: Array<{value: number; color: string; label: string}> = [];
      priceLines.push({ value: pp.costPrice, color: '#60a5fa', label: `成本 ¥${pp.costPrice.toFixed(4)}` });
      priceLines.push({ value: pp.sl, color: '#f87171', label: `SL ¥${pp.sl.toFixed(4)}` });
      if (pp.tp) priceLines.push({ value: pp.tp, color: '#c084fc', label: `TP ¥${pp.tp.toFixed(4)}` });
      if (pp.buyZone?.enabled) {
        pp.buyZone.levels.forEach(bz => {
          priceLines.push({ value: bz.price, color: '#34d399', label: `${bz.label} ¥${bz.price.toFixed(4)}` });
        });
      }
      priceLines.forEach(pl => {
        const y = yScale(pl.value);
        ctx.setLineDash([6, 3]);
        ctx.strokeStyle = pl.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = pl.color;
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(pl.label, padding.left + 2, y - 3);
      });
    }

    // K线
    klineData.forEach((d, i) => {
      const x = padding.left + gap * i + gap / 2;
      const isUp = d.close >= d.open;
      const color = isUp ? '#10b981' : '#ef4444';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yScale(d.high));
      ctx.lineTo(x, yScale(d.low));
      ctx.stroke();
      const bodyTop = yScale(Math.max(d.open, d.close));
      const bodyBottom = yScale(Math.min(d.open, d.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);
      ctx.fillStyle = color;
      ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
    });

    // 日期标签
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    const labelInterval = Math.max(1, Math.floor(klineData.length / 6));
    klineData.forEach((d, i) => {
      if (i % labelInterval === 0) {
        const x = padding.left + gap * i + gap / 2;
        ctx.fillText(d.date, x, h - 5);
      }
    });

    // 风险雷达
    const hasRisk = selectedFundData.simNav > 0 && alerts.some((a) => a.level === 'red' || a.level === 'yellow');
    if (hasRisk) {
      const radarX = w - 30;
      const radarY = 20;
      ctx.beginPath();
      ctx.arc(radarX, radarY, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239,68,68,0.3)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(radarX, radarY);
      ctx.arc(radarX, radarY, 7, 0, Math.PI * 0.8);
      ctx.closePath();
      ctx.fillStyle = 'rgba(239,68,68,0.6)';
      ctx.fill();
    }
  }, [klineData, buyThresholds, selectedFundData, alerts]);

  const refreshAll = useCallback(() => {
    refreshFunds();
    rescan();
  }, [refreshFunds, rescan]);

  return (
    <div className="space-y-4">
      {/* K线走势图 + 基金选择 */}
      <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-foreground">走势图</h3>
            <div className="flex items-center gap-1">
              {mergedFundData.map((f) => (
                <button
                  key={f.code}
                  onClick={() => setSelectedFund(f.code)}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    (selectedFund || mergedFundData[0]?.code) === f.code
                      ? 'bg-indigo/30 text-indigo'
                      : 'bg-muted/20 text-muted-foreground hover:bg-muted/30'
                  }`}
                >
                  {f.shortName}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {alerts.some((a) => a.level === 'red' || a.level === 'yellow') && (
              <div className="flex items-center gap-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-loss opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-loss" />
                </span>
                <span className="text-xs text-loss font-medium">风险预警中</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">更新：{lastUpdate || '--'}</span>
            <button onClick={refreshAll} className="text-xs px-2 py-1 rounded bg-indigo/20 text-indigo hover:bg-indigo/30 transition-colors">
              刷新
            </button>
          </div>
        </div>
        <canvas ref={chartRef} className="w-full rounded-lg bg-[#edf1f7]" style={{ height: '220px' }} />
        {/* 图例 */}
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-profit" /><span className="text-xs text-muted-foreground">阳线</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-loss" /><span className="text-xs text-muted-foreground">阴线</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-0 border-t-2 border-dashed border-gold" /><span className="text-xs text-gold">黄金坑</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-0 border-t-2 border-dashed border-loss" /><span className="text-xs text-loss">钻石坑</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-0 border-t-2 border-dashed border-blue-400" /><span className="text-xs text-blue-400">成本线</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-0 border-t-2 border-dashed border-red-400" /><span className="text-xs text-red-400">止损SL</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-0 border-t-2 border-dashed border-purple-400" /><span className="text-xs text-purple-400">止盈TP</span></div>
        </div>
      </div>

      {/* 下方两栏：左侧信号+策略 | 右侧周期+铁律 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 左侧：买点信号 + 满仓条件 */}
        <div className="col-span-2 space-y-4">
          {/* 买点信号表 */}
          <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
            <h3 className="text-sm font-medium text-foreground mb-3">买点信号</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-1.5 px-2 font-medium">基金</th>
                    <th className="text-left py-1.5 px-2 font-medium">档位</th>
                    <th className="text-right py-1.5 px-2 font-medium">阈值</th>
                    <th className="text-right py-1.5 px-2 font-medium">当前净值</th>
                    <th className="text-center py-1.5 px-2 font-medium">状态</th>
                    <th className="text-left py-1.5 px-2 font-medium">仓位</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map(s => (
                    <tr key={`${s.fundCode}-${s.tier}`} className={`border-b border-border/20 ${s.isTriggered ? 'bg-profit/5' : ''}`}>
                      <td className="py-2 px-2">
                        <span className="font-medium text-foreground">{s.fundName || s.fundCode}</span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          s.tierName.includes('黄金') ? 'bg-gold/20 text-gold' :
                          s.tierName.includes('钻石') ? 'bg-loss/20 text-loss' :
                          'bg-indigo/20 text-indigo'
                        }`}>{s.tierName}</span>
                      </td>
                      <td className="text-right py-2 px-2 font-mono text-gold">{s.threshold}</td>
                      <td className={`text-right py-2 px-2 font-mono font-bold ${s.isTriggered ? 'text-profit' : 'text-foreground'}`}>
                        {s.currentNav > 0 ? s.currentNav.toFixed(4) : '--'}
                      </td>
                      <td className="text-center py-2 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.isTriggered ? 'bg-profit/20 text-profit' : 'bg-muted/30 text-muted-foreground'
                        }`}>{s.isTriggered ? '已触发' : '未触发'}</span>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{s.positionRatio}</td>
                    </tr>
                  ))}
                  {signals.length === 0 && (
                    <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">暂无买点信号数据</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 满仓条件 + 预警 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
              <h3 className="text-sm font-medium text-foreground mb-3">企稳满仓条件</h3>
              <div className="space-y-2">
                {[
                  { label: '连续3阳线', met: fullCheck.consecutive3Up },
                  { label: '成交量1.5倍20日均', met: fullCheck.volume15x },
                  { label: '5/3日均线拐头', met: fullCheck.maTurnUp },
                  { label: '科创50站稳1200', met: fullCheck.star50Above1200 },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-2 rounded bg-muted/10">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className={`text-xs font-medium ${item.met ? 'text-profit' : 'text-muted-foreground'}`}>
                      {item.met ? '✓ 达标' : '✗ 未达标'}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-2 rounded bg-muted/20 mt-1">
                  <span className="text-xs font-medium text-foreground">综合判定</span>
                  <span className={`text-xs font-medium ${fullCheck.metCount >= 2 ? 'text-profit' : 'text-muted-foreground'}`}>
                    {fullCheck.metCount}/4 {fullCheck.metCount >= 2 ? '≥2项达标可加仓' : '未达标'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
              <h3 className="text-sm font-medium text-foreground mb-3">活跃预警</h3>
              {alerts.length === 0 ? (
                <div className="py-4 text-center">
                  <span className="text-xs px-3 py-1 rounded-full bg-profit/20 text-profit">当前无预警</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map(alert => (
                    <div key={alert.id} className={`p-2 rounded border ${
                      alert.level === 'red' ? 'border-loss/50 bg-loss/5' :
                      alert.level === 'yellow' ? 'border-gold/50 bg-gold/5' : 'border-profit/30 bg-profit/5'
                    }`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          alert.level === 'red' ? 'bg-loss/20 text-loss' :
                          alert.level === 'yellow' ? 'bg-gold/20 text-gold' : 'bg-profit/20 text-profit'
                        }`}>{alert.level === 'red' ? '红色' : alert.level === 'yellow' ? '黄色' : '常规'}</span>
                        <span className="text-xs font-medium text-foreground">{alert.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.action}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：三大周期 + 铁律 */}
        <div className="col-span-1 space-y-4">
          <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
            <h3 className="text-sm font-medium text-foreground mb-3">源哥三大周期</h3>
            <div className="space-y-3">
              {CYCLE_THEORIES.map(ct => (
                <div key={ct.id} className="p-3 rounded-lg bg-muted/10 border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-indigo">{ct.name}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gold/20 text-gold">{ct.currentPhase}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{ct.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
            <h3 className="text-sm font-medium text-foreground mb-3">投资铁律</h3>
            <div className="space-y-2">
              {IRON_RULES.slice(0, 4).map(rule => (
                <div key={rule.id} className="p-2 rounded bg-muted/10 border border-border/50">
                  <p className="text-xs font-medium text-foreground">{rule.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{rule.content}</p>
                </div>
              ))}
              <p className="text-xs text-indigo mt-2">完整铁律请在"学习"模块查看</p>
            </div>
          </div>

          {permission !== 'granted' && (
            <button
              onClick={requestPermission}
              className="w-full text-xs px-3 py-2 rounded-lg bg-gold/20 text-gold hover:bg-gold/30 transition-colors"
            >
              开启浏览器通知推送
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
