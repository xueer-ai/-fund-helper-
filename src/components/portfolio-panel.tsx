'use client';

import { useState, useEffect } from 'react';

interface FundData {
  code: string;
  name: string;
  nav: number;
  lastNav: number;
  change: number;
}

interface PortfolioPanelProps {
  funds: FundData[];
}

// 持仓参数
const HOLDING_DETAILS: Record<string, {
  fullName: string;
  costPrice: number;
  sl: number;
  tp: number | null;
  slPct: number;
  tpPct: number | null;
  role: string;
  statusDefault: string;
  statusColor: string;
  alertMsg: string;
  buyPoints: string[];
  bottomNote: string;
}> = {
  '012414': {
    fullName: '华夏国证半导体芯片ETF联接A',
    costPrice: 1.4194,
    sl: 1.1355,
    tp: 1.5613,
    slPct: -20.0,
    tpPct: 10.0,
    role: '右侧盈利-要保利润',
    statusDefault: '持有',
    statusColor: 'bg-[#10b981]',
    alertMsg: '距止损还差 -23.6%；距止盈还有 80.5% 🔼冲',
    buyPoints: [
      '第一批次减仓窗口：回撤达5%，可进1/3',
      '第二批次减仓：回撤达8%，再进1/3',
    ],
    bottomNote: '🔴补仓闸门关闭 — 不建议再加仓，先把利润落袋',
  },
  '019458': {
    fullName: '平安半导体领航精选混合C',
    costPrice: 1.4950,
    sl: 1.3455,
    tp: 1.6744,
    slPct: -10.0,
    tpPct: 12.0,
    role: '左侧被套-波动大',
    statusDefault: '认错警戒',
    statusColor: 'bg-[#ef4444]',
    alertMsg: '已触发破止损线 ¥1.3455，建议核对收盘价是否有效跌破；若是→执行减仓/清仓计划',
    buyPoints: [
      '小仓试探：¥1.4200',
      '小仓试探：¥1.3450',
    ],
    bottomNote: '🔴补仓闸门关闭，直到满足间距≥10交易日+大盘不极端',
  },
  '005536': {
    fullName: '宝盈转型动力灵活配置混合A',
    costPrice: 3.5577,
    sl: 3.2731,
    tp: 3.9135,
    slPct: -8.0,
    tpPct: 10.0,
    role: '趋势跟随-均衡灵活',
    statusDefault: '持有',
    statusColor: 'bg-[#10b981]',
    alertMsg: '距止损还差 -5.7%；距止盈还有 26.6% 🔼冲',
    buyPoints: [
      '趋势线规则：收盘<20MA且次日不能收回→减仓/警戒',
    ],
    bottomNote: '🔴补仓闸门关闭 — 不加仓直到趋势重新站上20MA',
  },
  '015556': {
    fullName: '博时新能源汽车主题混合A',
    costPrice: 1.0949,
    sl: 0.9635,
    tp: null,
    slPct: -12.0,
    tpPct: null,
    role: '主题周期-平本附近',
    statusDefault: '持有',
    statusColor: 'bg-[#10b981]',
    alertMsg: '距止损还有 13.1% 🔼冲',
    buyPoints: [
      '小仓试探：¥1.0200',
    ],
    bottomNote: '⚠️只有同时满足：①≤1.02 ②距上次买≥14天 ③大盘不暴跌（单日-2%内）→才极小仓试',
  },
};

export default function PortfolioPanel({ funds }: PortfolioPanelProps) {
  // AI仓位计算
  const aiFundCodes = ['012414', '019458'];
  const totalValue = 90000;
  const aiPosition = aiFundCodes.reduce((sum, code) => {
    const params = HOLDING_DETAILS[code];
    const fund = funds.find((f) => f.code === code);
    const nav = fund?.nav ?? params?.costPrice ?? 0;
    // 简化：按估算比例
    return sum + (nav / (params?.costPrice ?? 1)) * 20000;
  }, 0);
  const aiPct = Math.round((aiPosition / totalValue) * 100);
  const nonAiPct = 100 - aiPct;

  return (
    <div className="space-y-4">
      {/* 免责声明 */}
      <div className="bg-[#fff7ed] rounded-lg border border-[#fed7aa] px-4 py-2">
        <p className="text-xs text-[#9a3412]">
          ▲ 重要提示: 内容仅为逻辑推演复盘, 不构成任何基金、理财投资建议, 市场有波动, 入市需谨慎
        </p>
      </div>

      {/* AI主线仓位总览 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">AI主线仓位总览</h3>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#e5e7eb]">
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-[#6366f1]">{aiPct}%</p>
            <p className="text-xs text-[#6b7280] mt-1">AI专属仓位占比</p>
            <p className="text-xs text-[#9ca3af]">上限60%</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-[#4b5563]">{nonAiPct}%</p>
            <p className="text-xs text-[#6b7280] mt-1">非AI仓位</p>
            <p className="text-xs text-[#9ca3af]">宝盈+博时</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-[#1f2937]">¥{totalValue.toLocaleString()}</p>
            <p className="text-xs text-[#6b7280] mt-1">持仓总市值</p>
            <p className="text-xs text-[#9ca3af]">4只自有基金</p>
          </div>
        </div>
      </div>

      {/* 自有持仓基金 — 关键价位版 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">自有持仓基金 — 关键价位版</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          {Object.entries(HOLDING_DETAILS).map(([code, params]) => {
            const fund = funds.find((f) => f.code === code);
            const nav = fund?.nav ?? params.costPrice;
            const pnlPct = ((nav - params.costPrice) / params.costPrice) * 100;
            const distSL = ((nav - params.sl) / params.sl) * 100;
            const distTP = params.tp ? ((params.tp - nav) / nav) * 100 : null;

            return (
              <div key={code} className="rounded-lg border border-[#e5e7eb] overflow-hidden">
                {/* 卡片头部 */}
                <div className="px-4 py-2.5 bg-[#f9fafb] border-b border-[#e5e7eb] flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-[#1f2937]">{params.fullName}</span>
                    <span className="text-xs text-[#9ca3af] ml-2">{params.role}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs text-white font-medium ${params.statusColor}`}>
                    {params.statusDefault}
                  </span>
                </div>

                {/* 警示信息 */}
                <div className="px-4 py-2 bg-[#fef2f2] border-b border-[#fee2e2]">
                  <p className="text-xs text-[#dc2626] font-medium">{params.alertMsg}</p>
                </div>

                {/* 价位参考区 */}
                <div className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-0.5 bg-[#3b82f6] rounded" />
                    <span className="text-[#3b82f6] font-medium">成本线：¥{params.costPrice.toFixed(4)}</span>
                    <span className="text-[#9ca3af]">（锚）</span>
                  </div>
                  {params.tp && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-0.5 bg-[#f59e0b] rounded" />
                      <span className="text-[#f59e0b] font-medium">止盈TP：¥{params.tp.toFixed(4)}</span>
                      <span className="text-[#9ca3af]">+{params.tpPct}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-0.5 bg-[#ef4444] rounded" />
                    <span className="text-[#ef4444] font-medium">止损SL：¥{params.sl.toFixed(4)}</span>
                    <span className="text-[#9ca3af]">{params.slPct}%</span>
                  </div>
                  {params.buyPoints.map((bp, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-0.5 bg-[#10b981] rounded" />
                      <span className="text-[#10b981]">加仓点：{bp}</span>
                    </div>
                  ))}
                </div>

                {/* 当前数据 */}
                <div className="px-4 py-2 border-t border-[#e5e7eb] flex items-center justify-between">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] text-[#9ca3af]">当前净值</p>
                      <p className="text-sm font-mono font-medium text-[#1f2937]">{nav.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#9ca3af]">浮盈亏</p>
                      <p className={`text-sm font-mono font-medium ${pnlPct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#9ca3af]">距SL缓冲</p>
                      <p className={`text-sm font-mono font-medium ${distSL >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                        {distSL.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* 底部提示 */}
                <div className="px-4 py-2 bg-[#f9fafb] border-t border-[#e5e7eb]">
                  <p className="text-xs text-[#6b7280]">{params.bottomNote}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 操作记录 */}
      <div className="flex items-center justify-between px-2">
        <span className="text-xs text-[#9ca3af]">操作日记已录</span>
        <button className="text-xs text-[#6366f1] font-medium hover:underline">+ 记录操作</button>
      </div>
    </div>
  );
}
