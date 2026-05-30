'use client';

import { useState, useEffect } from 'react';
import { DISCLAIMER } from '@/lib/constants';
import { useScanResult, useNotification } from '@/lib/hooks';
import type { Alert, AlertLevel } from '@/lib/types';

export function RiskAlertPanel() {
  const { scanResult, loading, rescan } = useScanResult(true, 120000);
  const { notify, permission, requestPermission } = useNotification();
  const [filterLevel, setFilterLevel] = useState<AlertLevel | 'all'>('all');
  const [prevRedCount, setPrevRedCount] = useState(0);

  const alerts: Alert[] = scanResult?.alerts || [];

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

  // 合并动态和静态预警（去重）
  const dynamicIds = new Set(alerts.map((a) => a.id));
  const allAlerts = [...alerts, ...staticAlerts.filter((a) => !dynamicIds.has(a.id))];

  const filteredAlerts = filterLevel === 'all' ? allAlerts : allAlerts.filter((a) => a.level === filterLevel);

  const levelColors: Record<AlertLevel, { border: string; bg: string; badge: string; label: string }> = {
    normal: { border: 'border-profit/30', bg: 'bg-profit/5', badge: 'bg-profit/20 text-profit', label: '一级常规' },
    yellow: { border: 'border-amber/40', bg: 'bg-amber/5', badge: 'bg-amber/20 text-amber', label: '二级黄色' },
    red: { border: 'border-loss/50', bg: 'bg-loss/5', badge: 'bg-loss/20 text-loss', label: '三级红色' },
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-amber/90 font-medium">{DISCLAIMER}</p>

      {/* 预警级别筛选 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground">分级预警机制</h2>
          <div className="flex items-center gap-2">
            {permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="text-[10px] px-2 py-1 rounded bg-amber/20 text-amber hover:bg-amber/30 transition-colors mr-2"
              >
                开启推送通知
              </button>
            )}
            {(['all', 'normal', 'yellow', 'red'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`text-[10px] px-2 py-1 rounded transition-colors ${
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
            <p className="text-[10px] text-muted-foreground">一级常规</p>
          </div>
          <div className="p-3 rounded bg-amber/5 border border-amber/20 text-center">
            <p className="text-lg font-mono font-bold text-amber">{allAlerts.filter((a) => a.level === 'yellow').length}</p>
            <p className="text-[10px] text-muted-foreground">二级黄色</p>
          </div>
          <div className="p-3 rounded bg-loss/5 border border-loss/20 text-center">
            <p className="text-lg font-mono font-bold text-loss">{allAlerts.filter((a) => a.level === 'red').length}</p>
            <p className="text-[10px] text-muted-foreground">三级红色</p>
          </div>
        </div>

        {/* 动态扫描状态 */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
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
                <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${style.badge}`}>
                  {style.label}
                </span>
                <span className="text-xs font-medium text-foreground">{alert.title}</span>
                {alert.fundCode && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground font-mono">
                    {alert.fundCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed mb-2">{alert.message}</p>
              <div className="pt-2 border-t border-border/30">
                <p className="text-[10px] text-amber">
                  <span className="text-muted-foreground mr-1">处置方案：</span>
                  {alert.action}
                </p>
                {alert.knowledgeLink && (
                  <p className="text-[10px] text-indigo mt-1">
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
        <h3 className="text-sm font-medium text-foreground mb-3">风控铁律速查</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              title: '分批建仓3-3-4',
              desc: '备用资金分3批投入，禁止梭哈',
              level: 'normal' as AlertLevel,
            },
            {
              title: '追高拦截',
              desc: '159140>1.37 / 022364>5.68 劝阻新开仓',
              level: 'normal' as AlertLevel,
            },
            {
              title: '浮亏止损',
              desc: '平安半导体亏至20%立刻停补仓',
              level: 'yellow' as AlertLevel,
            },
            {
              title: '6个月时间止损',
              desc: '11月未创新高AI仓位压至20%以下',
              level: 'yellow' as AlertLevel,
            },
            {
              title: '极端风控',
              desc: '油价破90/加息50bp → 赎回宝盈+新能源 → AI仓位≤30%',
              level: 'red' as AlertLevel,
            },
          ].map((rule, i) => {
            const style = levelColors[rule.level];
            return (
              <div key={i} className={`p-3 rounded border ${style.border} ${style.bg}`}>
                <div className="flex items-center gap-1 mb-1">
                  <span className={`text-[8px] px-1 py-0.5 rounded ${style.badge}`}>
                    {rule.level === 'normal' ? '常规' : rule.level === 'yellow' ? '黄色' : '红色'}
                  </span>
                  <span className="text-xs font-medium text-foreground">{rule.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{rule.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
