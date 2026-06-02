'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FUNDS, CYCLE_THEORIES, IRON_RULES } from '@/lib/constants';
import { useFundData, useScanResult, useScheduler, useNotification } from '@/lib/hooks';
import type { Fund, BuySignal, FullPositionCheck, Alert } from '@/lib/types';

// 市场情绪指示灯类型
type MarketSentiment = 'bullish' | 'bearish' | 'neutral';

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
  const scheduler = useScheduler(60000);
  const { permission, requestPermission, notify } = useNotification();

  const [prevTriggeredCount, setPrevTriggeredCount] = useState(0);
  const [prevAlertCount, setPrevAlertCount] = useState(0);
  const [selectedFund, setSelectedFund] = useState<string>('');
  const chartRef = useRef<HTMLCanvasElement>(null);

  // 买入信号
  const signals: BuySignal[] = scanResult?.signals || [];
  const triggeredSignals = scanResult?.triggeredSignals || [];
  const fullCheck: FullPositionCheck = scanResult?.fullPositionCheck || {
    consecutive3Up: false, volume15x: false, maTurnUp: false, star50Above1200: false, metCount: 0, isReady: false,
  };
  const alerts: Alert[] = scanResult?.alerts || [];

  // AI仓位计算
  const aiPosition = 45;

  // 市场情绪判断：基于8只基金涨跌比例
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

  const upCount = mergedFundData.filter((f) => f.simChange > 0).length;
  const downCount = mergedFundData.filter((f) => f.simChange < 0).length;
  const sentiment: MarketSentiment = upCount > downCount + 2 ? 'bullish' : downCount > upCount + 2 ? 'bearish' : 'neutral';

  // 主力资金流向TOP3（基于涨跌幅排序模拟）
  const topSectors = [...mergedFundData]
    .filter((f) => f.simChange !== 0)
    .sort((a, b) => Math.abs(b.simChange) - Math.abs(a.simChange))
    .slice(0, 3);

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

  // 生成模拟K线数据（基于当前净值）
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

  // 选中基金的K线数据
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

    // 清空
    ctx.clearRect(0, 0, w, h);

    // 计算价格范围
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
      // 价格标签
      const price = maxPrice - (priceRange / 4) * i;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(4), w - padding.right + 4, y + 3);
    }

    // 买点阈值水平线
    buyThresholds.forEach((t) => {
      const y = yScale(t.value);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = t.type === 'golden' ? '#f59e0b' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 标签
      ctx.fillStyle = t.type === 'golden' ? '#b47a1b' : '#ef4444';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${t.label} ${t.value}`, w - padding.right + 4, y - 4);
    });

    // 用户持仓关键价位线（绿/红/蓝/紫）
    const fundForPP = FUNDS.find(f => f.code === selectedFundData?.code);
    const pp = fundForPP?.priceParams;
    if (pp) {
      const priceLines: Array<{value: number; color: string; label: string}> = [];
      // 蓝线：成本
      priceLines.push({ value: pp.costPrice, color: '#60a5fa', label: `成本 ¥${pp.costPrice.toFixed(4)}` });
      // 红线：硬止损SL
      priceLines.push({ value: pp.sl, color: '#f87171', label: `SL ¥${pp.sl.toFixed(4)}` });
      // 紫线：TP止盈
      if (pp.tp) priceLines.push({ value: pp.tp, color: '#c084fc', label: `TP ¥${pp.tp.toFixed(4)}` });
      // 绿线：BuyZone
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

    // K线绘制
    klineData.forEach((d, i) => {
      const x = padding.left + gap * i + gap / 2;
      const isUp = d.close >= d.open;
      const color = isUp ? '#10b981' : '#ef4444';

      // 上下影线
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yScale(d.high));
      ctx.lineTo(x, yScale(d.low));
      ctx.stroke();

      // 实体
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

    // 风险雷达角标：有预警时显示红色指示
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
      // 雷达扇形区域
      ctx.beginPath();
      ctx.moveTo(radarX, radarY);
      ctx.arc(radarX, radarY, 7, 0, Math.PI * 0.8);
      ctx.closePath();
      ctx.fillStyle = 'rgba(239,68,68,0.6)';
      ctx.fill();
    }
  }, [klineData, buyThresholds, selectedFundData, alerts]);

  // 刷新所有数据
  const refreshAll = useCallback(() => {
    refreshFunds();
    rescan();
  }, [refreshFunds, rescan]);

  return (
    <div className="space-y-5">
      {/* ====== 1. 顶部：市场情绪 + 主力资金TOP3 ====== */}
      <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* 市场情绪指示灯 */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  sentiment === 'bullish' ? 'bg-profit/20 shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                  sentiment === 'bearish' ? 'bg-loss/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                  'bg-gold/20 shadow-[0_0_15px_rgba(180,122,27,0.3)]'
                }`}>
                  {sentiment === 'bullish' ? '🟢' : sentiment === 'bearish' ? '🔴' : '🟡'}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {sentiment === 'bullish' ? '偏多' : sentiment === 'bearish' ? '偏空' : '震荡'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {upCount}涨 / {downCount}跌 / {mergedFundData.length - upCount - downCount}平
                </p>
              </div>
            </div>

            <div className="w-px h-8 bg-border" />

            {/* 主力资金净流入TOP3 */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">今日波动TOP3</p>
              <div className="flex items-center gap-3">
                {topSectors.map((f, i) => (
                  <div key={f.code} className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{i + 1}.</span>
                    <span className="text-xs font-medium text-foreground">{f.shortName}</span>
                    <span className={`text-sm font-mono font-bold ${f.simChange >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {f.simChange >= 0 ? '+' : ''}{f.simChange}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧快捷指标 */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">AI仓位</p>
              <p className="text-xl font-mono font-bold text-gold">{aiPosition}%</p>
              <p className="text-[11px] text-muted-foreground">上限60% · 余量{60 - aiPosition}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">买点触发</p>
              <span className={`inline-block text-sm font-mono font-bold px-2 py-0.5 rounded ${
                triggeredSignals.length > 0 ? 'bg-profit/20 text-profit' : 'bg-muted/30 text-muted-foreground'
              }`}>
                {triggeredSignals.length}
              </span>
              <p className="text-[11px] text-muted-foreground">/{signals.length}个阈值</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">满仓条件</p>
              <span className={`inline-block text-sm font-mono font-bold px-2 py-0.5 rounded ${
                fullCheck.metCount >= 2 ? 'bg-indigo/20 text-indigo' : 'bg-muted/30 text-muted-foreground'
              }`}>
                {fullCheck.metCount}/4
              </span>
              <p className="text-[11px] text-muted-foreground">{fullCheck.isReady ? '≥2项达标' : '未达标'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">活跃预警</p>
              <span className={`inline-block text-sm font-mono font-bold px-2 py-0.5 rounded ${
                alerts.some((a) => a.level === 'red') ? 'bg-loss/20 text-loss' :
                alerts.some((a) => a.level === 'yellow') ? 'bg-gold/20 text-gold' : 'bg-profit/20 text-profit'
              }`}>
                {alerts.length}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {alerts.filter((a) => a.level === 'red').length}红 · {alerts.filter((a) => a.level === 'yellow').length}黄
              </p>
            </div>
          </div>
        </div>

        {/* 调度状态条 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-4">
            <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
              scheduler?.isWorkday ? 'bg-profit/20 text-profit' : 'bg-muted/50 text-muted-foreground'
            }`}>
              {scheduler?.isWorkday ? '交易日' : '休市日'}
            </span>
            <span className="text-xs text-muted-foreground">
              时段：{scheduler?.currentPeriod === 'morning_learning' ? '早间学习' :
                scheduler?.currentPeriod === 'morning_report' ? '早间播报' :
                scheduler?.currentPeriod === 'noon_review' ? '午间复习' :
                scheduler?.currentPeriod === 'afternoon_scan' ? '尾盘扫描' :
                scheduler?.currentPeriod === 'close_archive' ? '收盘归档' :
                scheduler?.currentPeriod === 'close_learning' ? '收盘学习' :
                scheduler?.currentPeriod === 'after_hours' ? '盘后' : scheduler?.currentPeriod || '--'}
            </span>
            <span className="text-xs text-muted-foreground">
              布局期：{scheduler?.cycle?.phaseName || '--'}
            </span>
            {scheduler?.cycle && (
              <span className="text-xs text-gold">
                距国庆{scheduler.cycle.daysToNationalDay}天 · 距11月止损{scheduler.cycle.daysToNovember}天
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">更新：{lastUpdate || '--'}</span>
            <button
              onClick={refreshAll}
              className="text-xs px-2 py-1 rounded bg-indigo/20 text-indigo hover:bg-indigo/30 transition-colors"
            >
              重新扫描
            </button>
            {permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="text-xs px-2 py-1 rounded bg-gold/20 text-gold hover:bg-gold/30 transition-colors"
              >
                开启通知
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ====== 2. 中间区域：左侧K线图+策略 | 右侧持仓卡片 ====== */}
      <div className="grid grid-cols-3 gap-4">
        {/* 左侧：K线走势图 + 买卖点策略 */}
        <div className="col-span-2 space-y-4">
          {/* K线走势图 */}
          <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-medium text-foreground">走势图</h3>
                <div className="flex items-center gap-1">
                  {mergedFundData.slice(0, 4).map((f) => (
                    <button
                      key={f.code}
                      onClick={() => setSelectedFund(f.code)}
                      className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${
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
              {/* 风险雷达状态 */}
              {alerts.some((a) => a.level === 'red' || a.level === 'yellow') && (
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-loss opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-loss" />
                  </span>
                  <span className="text-[11px] text-loss font-medium">风险预警中</span>
                </div>
              )}
            </div>
            <canvas
              ref={chartRef}
              className="w-full rounded-lg bg-[#edf1f7]"
              style={{ height: '200px' }}
            />
            {/* 买卖点图例 */}
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/30">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0 border-t-2 border-dashed border-gold" />
                <span className="text-[11px] text-gold">黄金坑（买入支撑位）</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0 border-t-2 border-dashed border-loss" />
                <span className="text-[11px] text-loss">钻石坑（超跌买入位）</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-profit" />
                <span className="text-[11px] text-muted-foreground">阳线（收涨）</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-loss" />
                <span className="text-[11px] text-muted-foreground">阴线（收跌）</span>
              </div>
            </div>
          </div>

          {/* 应对策略表格 */}
          <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
            <h3 className="text-xs font-medium text-foreground mb-3">应对策略</h3>
            <div className="grid grid-cols-4 gap-3">
              {signals.map((s) => (
                <div
                  key={`${s.fundCode}-${s.tier}`}
                  className={`p-3 rounded-lg border transition-colors ${
                    s.isTriggered
                      ? 'bg-profit/10 border-profit/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                      : 'bg-muted/10 border-border hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.isTriggered ? 'bg-profit' : 'bg-muted-foreground/30'}`} />
                      <span className="text-xs font-medium text-foreground">{s.fundCode}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                        s.tierName.includes('黄金') ? 'bg-gold/20 text-gold' :
                        s.tierName.includes('钻石') ? 'bg-loss/20 text-loss' :
                        'bg-indigo/20 text-indigo'
                      }`}>
                        {s.tierName}
                      </span>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      s.isTriggered ? 'bg-profit/20 text-profit' : 'bg-muted/30 text-muted-foreground'
                    }`}>
                      {s.isTriggered ? '已触发' : '未触发'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">阈值 <span className="font-mono text-gold">{s.threshold}</span></span>
                    <span className="text-xs text-muted-foreground">当前 <span className={`font-mono ${s.isTriggered ? 'text-profit' : 'text-foreground'}`}>{s.currentNav > 0 ? s.currentNav.toFixed(4) : '--'}</span></span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">{s.positionRatio} · {s.knowledgeLink}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：持仓状态卡片 */}
        <div className="col-span-1 space-y-4">
          {/* 用户自有持仓 */}
          <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
            <h3 className="text-xs font-medium text-foreground mb-3">自有持仓状态</h3>
            <div className="space-y-3">
              {mergedFundData.filter((f) => f.isUserHolding).map((fund) => {
                const isUp = fund.simChange >= 0;
                const profitRate = fund.holding?.profitRate || 0;
                const profitColor = profitRate >= 0 ? 'text-profit' : 'text-loss';
                const riskTag = profitRate < -15 ? '高风险' : profitRate < 0 ? '关注' : profitRate > 40 ? '可止盈' : '持有';
                const tagBg = riskTag === '高风险' ? 'bg-loss/20 text-loss' :
                  riskTag === '关注' ? 'bg-gold/20 text-gold' :
                  riskTag === '可止盈' ? 'bg-profit/20 text-profit' : 'bg-muted/30 text-muted-foreground';
                return (
                  <div
                    key={fund.code}
                    className={`p-3 rounded-lg border transition-colors hover:bg-card-bg-hover ${
                      profitRate < -15 ? 'border-loss/30' : profitRate > 40 ? 'border-profit/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-medium text-foreground">{fund.name}</span>
                        <span className="text-xs text-muted-foreground ml-1 font-mono">{fund.code}</span>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${tagBg}`}>{riskTag}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[11px] text-muted-foreground">净值</p>
                        <p className="text-sm font-mono font-bold text-foreground">
                          {fund.simNav > 0 ? fund.simNav.toFixed(4) : '--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">今日</p>
                        <p className={`text-sm font-mono font-bold ${isUp ? 'text-profit' : 'text-loss'}`}>
                          {fund.simNav > 0 ? `${isUp ? '+' : ''}${fund.simChange}%` : '--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">浮盈亏</p>
                        <p className={`text-sm font-mono font-bold ${profitColor}`}>
                          {profitRate >= 0 ? '+' : ''}{profitRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 预警卡片 */}
          <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
            <h3 className="text-xs font-medium text-foreground mb-3">风控预警</h3>
            {alerts.length === 0 ? (
              <div className="py-4 text-center">
                <span className="text-[11px] px-3 py-1 rounded-full bg-profit/20 text-profit">当前无预警</span>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.level === 'red' ? 'border-loss/50 bg-loss/10' :
                      alert.level === 'yellow' ? 'border-gold/50 bg-gold/10' :
                      'border-profit/30 bg-profit/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        alert.level === 'red' ? 'bg-loss/30 text-loss' :
                        alert.level === 'yellow' ? 'bg-gold/30 text-gold' :
                        'bg-profit/20 text-profit'
                      }`}>
                        {alert.level === 'red' ? '三级红色' : alert.level === 'yellow' ? '二级黄色' : '一级常规'}
                      </span>
                      <span className="text-xs font-medium text-foreground">{alert.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-gold mt-1">处置：{alert.action}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== 3. 底部：全量监测标的（悬停联动） ====== */}
      <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
        <h3 className="text-xs font-medium text-foreground mb-3">
          全量监测标的
          {fundLoading && <span className="text-xs text-muted-foreground ml-2">加载中...</span>}
          <span className="text-xs text-muted-foreground ml-2 font-normal">悬停查看详情</span>
        </h3>
        <div className="grid grid-cols-8 gap-3">
          {mergedFundData.map((fund) => {
            const isUp = fund.simChange >= 0;
            const isSelected = selectedFund === fund.code;
            const categoryLabel = fund.category === 'ai_core' ? 'AI核心' :
              fund.category === 'ai_semi' ? 'AI半导体' :
              fund.category === 'backup' ? '备用金' :
              fund.category === 'non_ai' ? '非AI' : '指数';
            return (
              <div
                key={fund.code}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected ? 'border-indigo/50 bg-indigo/5 shadow-[0_0_10px_rgba(99,102,241,0.15)]' :
                  fund.isUserHolding ? 'border-gold/20 hover:border-gold/40' : 'border-border hover:border-border/80'
                }`}
                onMouseEnter={() => setSelectedFund(fund.code)}
                onClick={() => setSelectedFund(fund.code)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium text-foreground">{fund.name}</span>
                    <span className="text-xs text-muted-foreground ml-1 font-mono">{fund.code}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {fund.isRealtime && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-profit/20 text-profit">实时</span>
                    )}
                    <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                      fund.category === 'ai_core' ? 'bg-indigo/20 text-indigo' :
                      fund.category === 'ai_semi' ? 'bg-gold/20 text-gold' :
                      'bg-muted text-muted-foreground'
                    }`}>{categoryLabel}</span>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-mono font-bold text-foreground">
                      {fund.simNav > 0 ? fund.simNav.toFixed(fund.code === '科创50' ? 0 : 4) : '--'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fund.code === '科创50' ? '点' : '净值'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-medium ${isUp ? 'text-profit' : 'text-loss'}`}>
                      {fund.simNav > 0 ? `${isUp ? '+' : ''}${fund.simChange}%` : '--'}
                    </p>
                    {fund.holding && (
                      <p className={`text-xs font-mono ${
                        fund.holding.profitRate >= 0 ? 'text-profit' : 'text-loss'
                      }`}>
                        浮盈{fund.holding.profitRate >= 0 ? '+' : ''}{fund.holding.profitRate}%
                      </p>
                    )}
                  </div>
                </div>
                {/* 买点标签 */}
                {fund.buyPoints && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                    {fund.buyPoints.golden && (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                        fund.simNav > 0 && fund.simNav <= fund.buyPoints.golden ? 'bg-profit/20 text-profit font-medium' : 'bg-muted/50 text-muted-foreground'
                      }`}>
                        黄金坑≤{fund.buyPoints.golden}
                      </span>
                    )}
                    {fund.buyPoints.diamond && (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                        fund.simNav > 0 && fund.simNav <= fund.buyPoints.diamond ? 'bg-gold/20 text-gold font-medium' : 'bg-muted/50 text-muted-foreground'
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

      {/* ====== 4. 底部：三大周期 + 铁律 ====== */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
          <h3 className="text-xs font-medium text-foreground mb-3">源哥三大周期理论</h3>
          <div className="space-y-3">
            {CYCLE_THEORIES.map((ct) => (
              <div key={ct.id} className="p-3 rounded-lg bg-muted/10 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-indigo">{ct.name}</p>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gold/20 text-gold">
                    {ct.currentPhase}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{ct.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
          <h3 className="text-xs font-medium text-foreground mb-3">今日铁律复习</h3>
          <div className="space-y-2">
            {IRON_RULES.slice(0, 3).map((rule) => (
              <div key={rule.id} className="p-3 rounded-lg bg-muted/10 border border-border/50">
                <p className="text-xs font-medium text-foreground">{rule.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rule.content}</p>
              </div>
            ))}
            <p className="text-xs text-indigo mt-2">完整7条铁律请在"源哥言商学习"模块查看</p>
          </div>
        </div>

        {/* 今日操作要点 */}
        <div className="bg-card-bg rounded-xl p-4 border border-border shadow-lg">
          <h3 className="text-xs font-medium text-foreground mb-3">今日操作要点</h3>
          <div className="space-y-2">
            {triggeredSignals.length > 0 ? (
              triggeredSignals.map((s) => (
                <div key={`action-${s.fundCode}-${s.tier}`} className="p-3 rounded-lg bg-profit/10 border border-profit/30">
                  <p className="text-xs font-medium text-profit">{s.fundCode} {s.tierName}已触发</p>
                  <p className="text-xs text-muted-foreground mt-0.5">当前{s.currentNav.toFixed(4)} | {s.positionRatio}</p>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-lg bg-muted/10 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground">暂无触发买点</p>
                <p className="text-xs text-muted-foreground mt-0.5">耐心等待黄金坑/钻石坑信号</p>
              </div>
            )}
            {alerts.filter(a => a.level === 'red').map((a) => (
              <div key={`red-${a.id}`} className="p-3 rounded-lg bg-loss/10 border border-loss/30">
                <p className="text-xs font-medium text-loss">🔴 {a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.action}</p>
              </div>
            ))}
            {alerts.filter(a => a.level === 'yellow').map((a) => (
              <div key={`yellow-${a.id}`} className="p-3 rounded-lg bg-gold/10 border border-gold/30">
                <p className="text-xs font-medium text-gold">🟡 {a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.action}</p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">所有价位仅供参考，不构成投资建议</p>
          </div>
        </div>
      </div>
    </div>
  );
}
