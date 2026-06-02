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
const PORTFOLIO_DATA = [
  {
    code: '012414',
    name: '华夏国证半导体芯片ETF联接A',
    shortName: '华夏芯片',
    costPrice: 1.4194,
    sl: null,
    tp: 1.5613,
    tStopRule: '从最高点回撤-5%减1/3；-8%再减1/3',
    buyZone: null,
    role: '盈利仓·保利润',
    aiPosition: true,
    positionRatio: '25%',
    memo: '半导体属AI算力上游主线，计入60%AI专属仓位。止盈分批兑现，保留小底仓博弈国庆窗口。',
  },
  {
    code: '019458',
    name: '平安半导体领航精选混合C',
    shortName: '平安半导体',
    costPrice: 1.495,
    sl: 1.3455,
    tp: 1.6744,
    tStopRule: null,
    buyZone: '1.4200± / 1.3450±（需满足间距+大盘不极端）',
    role: '被套仓·等回本',
    aiPosition: true,
    positionRatio: '15%',
    memo: 'C类适合波段，反弹回本后逐步减仓，资金腾挪等待159140/022364黄金坑。浮亏≥20%强制减仓50%。',
  },
  {
    code: '006020',
    name: '宝盈转型动力灵活配置混合A',
    shortName: '宝盈转型',
    costPrice: 3.5577,
    sl: 3.2731,
    tp: 3.9135,
    tStopRule: '收盘<20MA且次日不能收回→减仓',
    buyZone: null,
    role: '备用金·不追加',
    aiPosition: false,
    positionRatio: '10%',
    memo: '非AI主线，不计入60%专属仓位。禁止追加资金，仅留存做宏观风险缓冲。极端处置时优先赎回。',
  },
  {
    code: '015556',
    name: '博时新能源汽车主题混合A',
    shortName: '博时新能源',
    costPrice: 1.0949,
    sl: 0.9635,
    tp: null,
    tStopRule: null,
    buyZone: '≤1.02且距上次买≥14天且大盘不暴跌→极小仓试',
    role: '底仓·观望',
    aiPosition: false,
    positionRatio: '8%',
    memo: '非AI赛道分散底仓，159140跌至1.28可赎回部分加仓主线。11月未启动则全额清仓回流AI。',
  },
];

export default function PortfolioPanel({ funds }: PortfolioPanelProps) {
  const [expandedFund, setExpandedFund] = useState<string | null>(null);

  // 计算仓位概览
  const aiFunds = PORTFOLIO_DATA.filter((f) => f.aiPosition);
  const nonAiFunds = PORTFOLIO_DATA.filter((f) => !f.aiPosition);
  const aiPositionPercent = 40; // 示例值
  const nonAiPositionPercent = 18;
  const totalMarketValue = '约12.8万'; // 示例值

  return (
    <div className="space-y-4">
      {/* 仓位概览卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-[#e5e7eb] p-4">
          <p className="text-xs text-[#6b7280] mb-1">AI专属仓位占比</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#6366f1]">
              {aiPositionPercent}
            </span>
            <span className="text-sm text-[#6b7280]">%</span>
          </div>
          <p className="text-xs text-[#9ca3af] mt-1">上限60% · {aiFunds.map(f => f.shortName).join('、')}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#e5e7eb] p-4">
          <p className="text-xs text-[#6b7280] mb-1">非AI仓位构成</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#6b7280]">
              {nonAiPositionPercent}
            </span>
            <span className="text-sm text-[#6b7280]">%</span>
          </div>
          <p className="text-xs text-[#9ca3af] mt-1">{nonAiFunds.map(f => f.shortName).join('、')}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#e5e7eb] p-4">
          <p className="text-xs text-[#6b7280] mb-1">持仓总市值</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#1f2937]">
              {totalMarketValue}
            </span>
          </div>
          <p className="text-xs text-[#9ca3af] mt-1">4只基金 · 2只AI + 2只非AI</p>
        </div>
      </div>

      {/* 持仓基金详情卡片 */}
      <div className="grid grid-cols-2 gap-4">
        {PORTFOLIO_DATA.map((fund) => {
          const liveData = funds.find((f) => f.code === fund.code);
          const currentNav = liveData?.nav ?? 0;
          const pnl = currentNav
            ? ((currentNav - fund.costPrice) / fund.costPrice) * 100
            : 0;
          const distSL = fund.sl && currentNav
            ? ((currentNav - fund.sl) / fund.sl) * 100
            : null;
          const distTP = fund.tp && currentNav
            ? ((fund.tp - currentNav) / currentNav) * 100
            : null;

          const isExpanded = expandedFund === fund.code;

          return (
            <div
              key={fund.code}
              className={`bg-white rounded-lg border overflow-hidden transition-colors ${
                fund.sl && currentNav && currentNav <= fund.sl
                  ? 'border-[#ef4444]/50'
                  : pnl < -5
                  ? 'border-[#f59e0b]/50'
                  : 'border-[#e5e7eb]'
              }`}
            >
              {/* 卡片头部 */}
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b border-[#f3f4f6] cursor-pointer hover:bg-[#f9fafb]"
                onClick={() =>
                  setExpandedFund(isExpanded ? null : fund.code)
                }
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-[#1f2937]">
                    {fund.shortName}
                  </span>
                  <span className="text-xs text-[#9ca3af] font-mono">
                    {fund.code}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      fund.aiPosition
                        ? 'bg-[#6366f1]/10 text-[#6366f1]'
                        : 'bg-[#9ca3af]/10 text-[#9ca3af]'
                    }`}
                  >
                    {fund.aiPosition ? 'AI' : '非AI'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono font-bold text-sm ${
                      pnl > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
                    }`}
                  >
                    {pnl > 0 ? '+' : ''}
                    {pnl.toFixed(2)}%
                  </span>
                  <span className="text-xs text-[#9ca3af]">
                    {isExpanded ? '收起' : '展开'}
                  </span>
                </div>
              </div>

              {/* 关键数据行 */}
              <div className="grid grid-cols-4 gap-0 px-4 py-3 border-b border-[#f3f4f6]">
                <div className="text-center">
                  <p className="text-xs text-[#9ca3af]">当前净值</p>
                  <p className="text-sm font-mono font-medium text-[#1f2937] mt-0.5">
                    {currentNav ? currentNav.toFixed(4) : '-'}
                  </p>
                </div>
                <div className="text-center border-l border-[#f3f4f6]">
                  <p className="text-xs text-[#9ca3af]">成本线</p>
                  <p className="text-sm font-mono text-[#3b82f6] mt-0.5">
                    {fund.costPrice.toFixed(4)}
                  </p>
                </div>
                <div className="text-center border-l border-[#f3f4f6]">
                  <p className="text-xs text-[#9ca3af]">止损线</p>
                  <p className="text-sm font-mono text-[#ef4444] mt-0.5">
                    {fund.sl ? fund.sl.toFixed(4) : '-'}
                  </p>
                </div>
                <div className="text-center border-l border-[#f3f4f6]">
                  <p className="text-xs text-[#9ca3af]">止盈线</p>
                  <p className="text-sm font-mono text-[#10b981] mt-0.5">
                    {fund.tp ? fund.tp.toFixed(4) : '-'}
                  </p>
                </div>
              </div>

              {/* 展开详情 */}
              {isExpanded && (
                <div className="px-4 py-3 space-y-2 bg-[#f9fafb]">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-[#6b7280] flex-shrink-0 w-16">
                      角色
                    </span>
                    <span className="text-xs text-[#374151]">{fund.role}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-[#6b7280] flex-shrink-0 w-16">
                      仓位占比
                    </span>
                    <span className="text-xs text-[#374151]">{fund.positionRatio}</span>
                  </div>
                  {fund.tStopRule && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-[#6b7280] flex-shrink-0 w-16">
                        动态止盈
                      </span>
                      <span className="text-xs text-[#374151]">{fund.tStopRule}</span>
                    </div>
                  )}
                  {fund.buyZone && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-[#6b7280] flex-shrink-0 w-16">
                        补仓区
                      </span>
                      <span className="text-xs text-[#374151]">{fund.buyZone}</span>
                    </div>
                  )}
                  {distSL !== null && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-[#6b7280] flex-shrink-0 w-16">
                        距止损
                      </span>
                      <span
                        className={`text-xs font-mono font-medium ${
                          distSL < 5 ? 'text-[#ef4444]' : 'text-[#374151]'
                        }`}
                      >
                        {distSL.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {distTP !== null && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-[#6b7280] flex-shrink-0 w-16">
                        距止盈
                      </span>
                      <span className="text-xs text-[#374151] font-mono">
                        {distTP.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 pt-1 border-t border-[#e5e7eb]">
                    <span className="text-xs font-medium text-[#6b7280] flex-shrink-0 w-16">
                      操作备忘
                    </span>
                    <span className="text-xs text-[#6b7280]">{fund.memo}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
