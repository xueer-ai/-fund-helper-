'use client';

import { useState } from 'react';

interface FundData {
  code: string;
  name: string;
  nav: number;
  lastNav: number;
  change: number;
}

interface RiskAlertPanelProps {
  funds: FundData[];
}

type AlertLevel = 'green' | 'yellow' | 'red';

// 预警数据
const ALERTS = [
  {
    id: 1,
    level: 'green' as AlertLevel,
    title: '黄金坑买点触发',
    target: '159140 科创AI',
    condition: '净值≤1.37（5.12高点回调20%）',
    action: '分2-3天买入12%总仓位，执行3-3-4第一步',
    knowledge: '分批建仓铁律 · 不见兔子不撒鹰',
  },
  {
    id: 2,
    level: 'green' as AlertLevel,
    title: '华夏芯片小幅止盈提示',
    target: '012414 华夏芯片',
    condition: '浮盈≥10%且接近TP目标',
    action: '可考虑分批兑现，锁定部分利润',
    knowledge: '财富变现与流动性管理',
  },
  {
    id: 3,
    level: 'yellow' as AlertLevel,
    title: '平安半导体浮亏接近止损',
    target: '019458 平安半导体',
    condition: '浮亏接近-10%（距止损线<5%）',
    action: '核对收盘价是否有效跌破1.3455，若跌破执行减仓/清仓',
    knowledge: '价格止损铁律 · 纪律大于天',
  },
  {
    id: 4,
    level: 'yellow' as AlertLevel,
    title: '距11月时间止损仅剩不足6个月',
    target: '全部AI持仓',
    condition: '时间止损倒计时',
    action: '关注行情是否创新高，未创新高则11月压缩AI仓位至20%以下',
    knowledge: '时间止损铁律 · 时间>价格',
  },
  {
    id: 5,
    level: 'red' as AlertLevel,
    title: '平安半导体触及硬止损线',
    target: '019458 平安半导体',
    condition: '净值≤1.3455（-10%硬止损）',
    action: '🔴 认错警戒！核对收盘价确认有效跌破→执行减仓/清仓，暂停一切加仓',
    knowledge: '价格止损铁律 · 纪律大于天',
  },
  {
    id: 6,
    level: 'red' as AlertLevel,
    title: '极端风险：油价破90/美联储加息50bp',
    target: '全部持仓',
    condition: '外围重大利空事件',
    action: '优先赎回宝盈/新能源，AI总仓位降至30%以内',
    knowledge: '极端行情应对 · 现金财富守恒定律',
  },
];

// 风险标的速览
const RISK_TARGETS = [
  { code: '019458', name: '平安半导体', sl: 1.3455, riskNote: '浮亏接近止损' },
  { code: '015556', name: '博时新能源', sl: 0.9635, riskNote: '底仓观望' },
];

const LEVEL_CONFIG = {
  green: {
    label: '一级常规',
    color: 'bg-[#10b981]',
    bgColor: 'bg-[#10b981]/5',
    borderColor: 'border-[#10b981]/20',
    textColor: 'text-[#10b981]',
    tagBg: 'bg-[#10b981]',
  },
  yellow: {
    label: '二级黄色',
    color: 'bg-[#f59e0b]',
    bgColor: 'bg-[#f59e0b]/5',
    borderColor: 'border-[#f59e0b]/20',
    textColor: 'text-[#f59e0b]',
    tagBg: 'bg-[#f59e0b]',
  },
  red: {
    label: '三级红色',
    color: 'bg-[#ef4444]',
    bgColor: 'bg-[#ef4444]/5',
    borderColor: 'border-[#ef4444]/20',
    textColor: 'text-[#ef4444]',
    tagBg: 'bg-[#ef4444]',
  },
};

export default function RiskAlertPanel({ funds }: RiskAlertPanelProps) {
  const [activeLevel, setActiveLevel] = useState<AlertLevel | 'all'>('all');

  const filteredAlerts =
    activeLevel === 'all'
      ? ALERTS
      : ALERTS.filter((a) => a.level === activeLevel);

  const levelCounts = {
    green: ALERTS.filter((a) => a.level === 'green').length,
    yellow: ALERTS.filter((a) => a.level === 'yellow').length,
    red: ALERTS.filter((a) => a.level === 'red').length,
  };

  return (
    <div className="space-y-4">
      {/* 预警等级标签栏 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#e5e7eb]">
          <button
            onClick={() => setActiveLevel('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeLevel === 'all'
                ? 'bg-[#1f2937] text-white'
                : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
            }`}
          >
            全部 ({ALERTS.length})
          </button>
          {(['green', 'yellow', 'red'] as AlertLevel[]).map((level) => {
            const config = LEVEL_CONFIG[level];
            return (
              <button
                key={level}
                onClick={() => setActiveLevel(level)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeLevel === level
                    ? `${config.tagBg} text-white`
                    : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                }`}
              >
                {config.label} ({levelCounts[level]})
              </button>
            );
          })}
        </div>

        {/* 预警列表 */}
        <div className="p-4 space-y-3">
          {filteredAlerts.map((alert) => {
            const config = LEVEL_CONFIG[alert.level];
            return (
              <div
                key={alert.id}
                className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
              >
                <div className="flex items-center gap-2 px-4 py-2">
                  <span
                    className={`w-1 h-8 rounded-full ${config.color} flex-shrink-0`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${config.textColor}`}
                      >
                        {alert.title}
                      </span>
                      <span className="text-xs text-[#9ca3af]">
                        {alert.target}
                      </span>
                    </div>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      触发条件：{alert.condition}
                    </p>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-[#e5e7eb]/50 bg-white/50">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[#374151]">
                        处置方案
                      </p>
                      <p className="text-xs text-[#6b7280] mt-0.5">
                        {alert.action}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-medium text-[#6366f1]">
                        关联学习
                      </p>
                      <p className="text-xs text-[#6366f1]/70 mt-0.5">
                        {alert.knowledge}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 风险标的速览 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">风险标的速览</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          {RISK_TARGETS.map((target) => {
            const liveData = funds.find((f) => f.code === target.code);
            const currentNav = liveData?.nav ?? 0;
            const distSL =
              currentNav && target.sl
                ? ((currentNav - target.sl) / target.sl) * 100
                : null;

            return (
              <div
                key={target.code}
                className="p-3 rounded-lg bg-[#f9fafb] border border-[#e5e7eb]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1f2937]">
                    {target.name}
                  </span>
                  <span className="text-xs text-[#9ca3af] font-mono">
                    {target.code}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-xs text-[#9ca3af]">当前净值</p>
                    <p className="text-sm font-mono font-medium text-[#1f2937]">
                      {currentNav ? currentNav.toFixed(4) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af]">止损线</p>
                    <p className="text-sm font-mono text-[#ef4444]">
                      {target.sl.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af]">距止损</p>
                    <p
                      className={`text-sm font-mono font-medium ${
                        distSL !== null && distSL < 5
                          ? 'text-[#ef4444]'
                          : 'text-[#374151]'
                      }`}
                    >
                      {distSL !== null ? `${distSL.toFixed(1)}%` : '-'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#f59e0b] mt-1.5">{target.riskNote}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
