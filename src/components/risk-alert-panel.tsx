'use client';

import { useState, useEffect } from 'react';
import { DISCLAIMER, FUNDS } from '@/lib/constants';
import { useScanResult, useNotification, useFundData } from '@/lib/hooks';
import type { Alert, AlertLevel, Fund } from '@/lib/types';

export function RiskAlertPanel() {
  const { scanResult, loading, rescan } = useScanResult(true, 120000);
  const { notify, permission, requestPermission } = useNotification();
  const { fundData, loading: fundLoading } = useFundData(true);
  const [filterLevel, setFilterLevel] = useState<AlertLevel | 'all'>('all');
  const [prevRedCount, setPrevRedCount] = useState(0);

  const alerts: Alert[] = scanResult?.alerts || [];

  // 带priceParams的持仓基金
  const holdingsWithPP = FUNDS.filter((f: Fund) => f.priceParams);

  // ===== 基于精确参数的动态预警 =====
  const priceAlerts: Alert[] = holdingsWithPP.flatMap((h: Fund) => {
    const pp = h.priceParams!;
    const liveFund = fundData?.find((f: { code: string }) => f.code === h.code);
    const nav = liveFund?.nav || 0;
    const result: Alert[] = [];
    // 硬止损SL检测
    if (nav > 0 && nav <= pp.sl) {
      result.push({
        id: `sl_${h.code}`,
        level: 'red' as AlertLevel,
        title: `🔴 认错警戒：${h.name}触及硬止损`,
        message: `当前净值${nav} ≤ SL止损线${pp.sl}，已从成本${pp.costPrice}下跌超限。核对收盘价是否有效跌破，若是→执行减仓/清仓计划。`,
        fundCode: h.code,
        timestamp: new Date(),
        action: '核对收盘价 → 有效跌破则减仓/清仓',
        knowledgeLink: '价格止损铁律',
      });
    }
    // 动态止盈回撤检测（tStop）
    if (pp.tStop?.enabled && nav > 0) {
      const hHigh = Math.max(nav, pp.costPrice * 1.5);
      const drawdown = (hHigh - nav) / hHigh;
      const levels = pp.tStop.levels.slice().sort((a, b) => b.dropPct - a.dropPct);
      for (const lv of levels) {
        if (drawdown * 100 >= lv.dropPct) {
          const isHighest = lv.dropPct >= 5;
          result.push({
            id: `tstop${lv.dropPct}_${h.code}`,
            level: (isHighest ? 'yellow' : 'normal') as AlertLevel,
            title: `${isHighest ? '🟡' : '🟢'} ${h.name}从高点回撤≥${lv.dropPct}%`,
            message: `回撤达${(drawdown * 100).toFixed(1)}%。${lv.action}`,
            fundCode: h.code,
            timestamp: new Date(),
            action: lv.action,
            knowledgeLink: '动态止盈回撤铁律',
          });
          break;
        }
      }
    }
    // 距SL缓冲提示（所有持仓）
    if (nav > 0 && nav > pp.sl) {
      const bufferPct = ((nav - pp.sl) / pp.sl * 100);
      if (bufferPct < 5) {
        result.push({
          id: `buffer_${h.code}`,
          level: 'yellow' as AlertLevel,
          title: `🟡 ${h.name}距止损线仅${bufferPct.toFixed(1)}%缓冲`,
          message: `当前净值${nav}，SL线${pp.sl}，距止损不足5%。补仓闸门关闭，等待间距+大盘条件。`,
          fundCode: h.code,
          timestamp: new Date(),
          action: '补仓闸门关闭，间距+大盘条件缺一不可',
          knowledgeLink: '补仓间距铁律',
        });
      }
    }
    return result;
  });

  // 红色预警自动通知
  useEffect(() => {
    const redCount = alerts.filter((a) => a.level === 'red').length;
    if (redCount > prevRedCount && prevRedCount >= 0) {
      const newRedAlerts = alerts.filter((a) => a.level === 'red').slice(prevRedCount);
      for (const alert of newRedAlerts) {
        notify('红色紧急预警', `${alert.title}: ${alert.message}`, `alert_red_${alert.id}`);
      }
    }
    setPrevRedCount(redCount);
  }, [alerts, prevRedCount, notify]);

  // 静态风控铁律预警（始终展示）
  const staticAlerts: Alert[] = [
    {
      id: 'static_baoying',
      level: 'normal',
      title: '宝盈备用金不加仓铁律',
      message: '半年内禁止追加资金，仅做应急备用金。极端风险时优先赎回回笼资金。',
      fundCode: '宝盈转型',
      timestamp: new Date(),
      action: '不操作 → 极端风险时优先赎回',
      knowledgeLink: '现金财富守恒定律',
    },
    {
      id: 'static_boshi',
      level: 'normal',
      title: '博时新能源底仓规则',
      message: '非AI赛道分散底仓，无行情不操作。钻石坑变现需等159140跌至1.28超跌点位。',
      fundCode: '博时新能源',
      timestamp: new Date(),
      action: '不操作 → 159140跌至1.28可赎回加仓主线',
      knowledgeLink: '机会优先级排序',
    },
    {
      id: 'static_extreme',
      level: 'red',
      title: '极端风险预案（待触发）',
      message: '若油价破90美元或美联储加息50bp，触发三级红色预警。需立即赎回宝盈/新能源，AI总仓位下调至30%以内。',
      timestamp: new Date(),
      action: '1.赎回宝盈转型 → 2.赎回博时新能源 → 3.AI仓位压至30% → 4.推送源哥极端风险应对学习',
      knowledgeLink: '极端行情应对',
    },
  ];

  // 合并动态和静态预警+价格参数预警（去重）
  const dynamicIds = new Set(alerts.map((a) => a.id));
  const priceAlertIds = new Set(priceAlerts.map((a) => a.id));
  const allAlerts = [...priceAlerts, ...alerts, ...staticAlerts.filter((a) => !dynamicIds.has(a.id) && !priceAlertIds.has(a.id))];

  const filteredAlerts = filterLevel === 'all' ? allAlerts : allAlerts.filter((a) => a.level === filterLevel);

  const levelColors: Record<AlertLevel, { border: string; bg: string; badge: string; label: string }> = {
    normal: { border: 'border-profit/30', bg: 'bg-profit/5', badge: 'bg-profit/20 text-profit', label: '一级常规' },
    yellow: { border: 'border-gold/40', bg: 'bg-gold/5', badge: 'bg-gold/20 text-gold', label: '二级黄色' },
    red: { border: 'border-loss/50', bg: 'bg-loss/5', badge: 'bg-loss/20 text-loss', label: '三级红色' },
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-gold/90 font-medium">{DISCLAIMER}</p>

      {/* 预警级别筛选 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground">分级预警机制</h2>
          <div className="flex items-center gap-2">
            {permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="text-xs px-2 py-1 rounded bg-gold/20 text-gold hover:bg-gold/30 transition-colors mr-2"
              >
                开启推送通知
              </button>
            )}
            {(['all', 'normal', 'yellow', 'red'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  filterLevel === level ? 'bg-primary/20 text-primary font-medium' : 'bg-muted/30 text-muted-foreground'
                }`}
              >
                {level === 'all' ? '全部' : level === 'normal' ? '常规' : level === 'yellow' ? '黄色' : '红色'}
                {level !== 'all' && (
                  <span className="ml-1">({allAlerts.filter((a) => a.level === level).length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 预警统计 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded bg-profit/5 border border-profit/20 text-center">
            <p className="text-lg font-mono font-bold text-profit">{allAlerts.filter((a) => a.level === 'normal').length}</p>
            <p className="text-xs text-muted-foreground">一级常规</p>
          </div>
          <div className="p-3 rounded bg-gold/5 border border-gold/20 text-center">
            <p className="text-lg font-mono font-bold text-gold">{allAlerts.filter((a) => a.level === 'yellow').length}</p>
            <p className="text-xs text-muted-foreground">二级黄色</p>
          </div>
          <div className="p-3 rounded bg-loss/5 border border-loss/20 text-center">
            <p className="text-lg font-mono font-bold text-loss">{allAlerts.filter((a) => a.level === 'red').length}</p>
            <p className="text-xs text-muted-foreground">三级红色</p>
          </div>
        </div>

        {/* 动态扫描状态 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{loading ? '扫描中...' : scanResult ? `上次扫描：${scanResult.scanTime?.split('T')[1]?.split('.')[0] || '--'}` : '待扫描'}</span>
          <button onClick={rescan} className="text-indigo hover:underline">重新扫描</button>
        </div>
      </div>

      {/* 预警列表 */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const style = levelColors[alert.level];
          return (
            <div key={alert.id} className={`p-4 rounded-lg border ${style.border} ${style.bg} alert-slide-in`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${style.badge}`}>
                  {style.label}
                </span>
                <span className="text-xs font-medium text-foreground">{alert.title}</span>
                {alert.fundCode && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground font-mono">
                    {alert.fundCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed mb-2">{alert.message}</p>
              <div className="pt-2 border-t border-border/30">
                <p className="text-xs text-gold">
                  <span className="text-muted-foreground mr-1">处置方案：</span>
                  {alert.action}
                </p>
                {alert.knowledgeLink && (
                  <p className="text-xs text-indigo mt-1">
                    关联学习：{alert.knowledgeLink}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 风控铁律速查 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">风控铁律速查（含精确价位）</h3>
        <div className="grid grid-cols-2 gap-3">
          {holdingsWithPP.map((h: Fund) => {
            const pp = h.priceParams!;
            const liveFund = fundData?.find((f: { code: string }) => f.code === h.code);
            const nav = liveFund?.nav || 0;
            const bufferPct = nav > 0 ? ((nav - pp.sl) / pp.sl * 100).toFixed(1) : '--';
            return (
              <div key={h.code} className="p-3 rounded border border-loss/30 bg-loss/5">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[8px] px-1 py-0.5 rounded bg-loss/20 text-loss">硬止损</span>
                  <span className="text-xs font-medium text-foreground">{h.name}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <p><span className="text-blue-400">成本:{pp.costPrice}</span> <span className="text-loss">SL:{pp.sl}</span></p>
                  <p><span className="text-purple-400">TP:{pp.tp || '--'}</span> {pp.tStop?.enabled && <span className="text-purple-400">动态回撤</span>}</p>
                  <p className="text-muted-foreground">距SL缓冲: <span className={Number(bufferPct) < 5 ? 'text-loss font-medium' : 'text-profit'}>{bufferPct}%</span></p>
                </div>
              </div>
            );
          })}
          <div className="p-3 rounded border border-profit/20 bg-profit/5">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[8px] px-1 py-0.5 rounded bg-profit/20 text-profit">建仓</span>
              <span className="text-xs font-medium text-foreground">补仓间距</span>
            </div>
            <p className="text-xs text-muted-foreground">同基金两次补仓≥10交易日，至少再跌5%才考虑第二批</p>
          </div>
          <div className="p-3 rounded border border-gold/30 bg-gold/5">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[8px] px-1 py-0.5 rounded bg-gold/20 text-gold">纪律</span>
              <span className="text-xs font-medium text-foreground">助手只亮灯</span>
            </div>
            <p className="text-xs text-muted-foreground">所有价位只做观察+提示，助手不能替你点买卖按钮</p>
          </div>
        </div>
      </div>
    </div>
  );
}
