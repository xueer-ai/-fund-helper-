'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFundData, type FundRealtimeData } from '@/lib/hooks';
import type { TabId } from '@/lib/types';

// 动态导入各功能面板
import DashboardOverview from '@/components/dashboard-overview';
import BuySignalPanel from '@/components/buy-signal-panel';
import PortfolioPanel from '@/components/portfolio-panel';
import LearningPanel from '@/components/learning-panel';
import RiskAlertPanel from '@/components/risk-alert-panel';
import CommandPanel from '@/components/command-panel';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: '总览' },
  { id: 'buy', label: '买点' },
  { id: 'portfolio', label: '持仓' },
  { id: 'learning', label: '学习' },
  { id: 'risk', label: '风控' },
  { id: 'command', label: '指令' },
];

// 基金代码→短名称映射
const FUND_NAMES: Record<string, string> = {
  '159140': '科创AI',
  '159142': '替代科创',
  '022364': '永赢科技',
  '012414': '华夏芯片',
  '019458': '平安半导体',
  '006020': '宝盈转型',
  '015556': '博时新能源',
  '科创50': '科创50',
};

// 持仓基金列表
const HOLDING_FUNDS = ['012414', '019458', '006020', '015556'];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [now, setNow] = useState<string>('');

  const { fundData: funds, loading, dataQuality, refresh } = useFundData();

  // 时钟
  useEffect(() => {
    const update = () => {
      setNow(new Date().toLocaleString('zh-CN', { hour12: false }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // 判断交易日
  const dayOfWeek = new Date().getDay();
  const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;

  // 周期倒计时
  const daysToNationalDay = Math.max(
    0,
    Math.ceil(
      (new Date('2026-10-01').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );
  const daysToStopLoss = Math.max(
    0,
    Math.ceil(
      (new Date('2026-11-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  // 持仓基金实时数据
  const holdingFunds = HOLDING_FUNDS.map((code) => {
    const f = funds.find((fd: FundRealtimeData) => fd.code === code);
    return {
      code,
      name: FUND_NAMES[code] || code,
      nav: f?.nav ?? 0,
      change: f?.change ?? 0,
    };
  });

  // 信号摘要
  const signalCount = funds.filter((f: FundRealtimeData) => {
    const nav = f.nav;
    if (f.code === '159140') return nav <= 1.37;
    if (f.code === '022364') return nav <= 5.68;
    return false;
  }).length;

  // 预警摘要
  const alertCount = funds.filter((f: FundRealtimeData) => {
    const nav = f.nav;
    if (f.code === '019458') return nav <= 1.3455;
    return false;
  }).length;

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      {/* ===== 顶栏 ===== */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb]">
        {/* 第一行：系统名 + 日期 + 周期 + 校准 + 时间 */}
        <div className="flex items-center justify-between px-5 h-12">
          <div className="flex items-center gap-4">
            <span className="text-base font-bold text-[#1f2937]">
              源哥AI基金监控
            </span>
            <span className="text-sm text-[#6b7280]">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })}
            </span>
            {isWorkday ? (
              <span className="text-xs px-2 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] font-medium">
                交易日
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-[#9ca3af]/10 text-[#9ca3af]">
                休市
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded bg-[#6366f1]/10 text-[#6366f1] font-medium">
              布局期
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#6b7280]">
            <span>
              国庆<span className="font-mono font-medium text-[#1f2937]">{daysToNationalDay}</span>天
            </span>
            <span>
              11月止损<span className="font-mono font-medium text-[#1f2937]">{daysToStopLoss}</span>天
            </span>
            <span>
              待校准
              <span className={`font-mono font-medium ${dataQuality && dataQuality.isStale ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                {dataQuality ? `${dataQuality.fallback}/${dataQuality.total}` : '0/7'}
              </span>
            </span>
            <span className="text-[#9ca3af]">{now}</span>
          </div>
        </div>

        {/* 免责声明横条 */}
        <div className="bg-[#fffbeb] border-b border-[#fde68a] px-5 py-1.5">
          <p className="text-xs text-[#92400e]">
            ⚠️ 重要提示：内容仅为逻辑推演复盘，不构成任何基金、理财投资建议，市场有波动，入市需谨慎
          </p>
        </div>

        {/* 标签导航 */}
        <div className="flex items-center gap-1 px-5 h-10 bg-white">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#6366f1] text-white'
                  : 'text-[#6b7280] hover:bg-[#f3f4f6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          {/* 信号/预警速览 */}
          <div className="flex items-center gap-3 text-xs">
            {signalCount > 0 && (
              <span className="text-[#10b981] font-medium">
                买点 {signalCount}
              </span>
            )}
            {alertCount > 0 && (
              <span className="text-[#ef4444] font-medium">
                预警 {alertCount}
              </span>
            )}
            <button
              onClick={() => refresh()}
              className="text-[#6366f1] hover:text-[#4f46e5] font-medium"
            >
              刷新
            </button>
          </div>
        </div>
      </header>

      {/* ===== 我的持仓表格（持仓优先，始终可见）===== */}
      <div className="px-5 pt-4">
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e7eb]">
            <h2 className="text-sm font-bold text-[#1f2937]">我的持仓</h2>
            <span className="text-xs text-[#9ca3af]">
              {isWorkday ? '交易中 · 数据实时更新' : '休市日 · 显示最近交易日数据'}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f9fafb] text-[#6b7280] text-xs">
                <th className="text-left px-4 py-2 font-medium">基金名称</th>
                <th className="text-right px-3 py-2 font-medium">当前净值</th>
                <th className="text-right px-3 py-2 font-medium">今日涨跌</th>
                <th className="text-right px-3 py-2 font-medium">成本价</th>
                <th className="text-right px-3 py-2 font-medium">浮盈亏</th>
                <th className="text-center px-3 py-2 font-medium">状态</th>
                <th className="text-right px-3 py-2 font-medium">止损线</th>
                <th className="text-right px-3 py-2 font-medium">止盈线</th>
                <th className="text-right px-3 py-2 font-medium">距止损</th>
                <th className="text-right px-3 py-2 font-medium">距止盈</th>
                <th className="text-center px-3 py-2 font-medium">角色</th>
              </tr>
            </thead>
            <tbody>
              {holdingFunds.map((fund) => {
                const params = getFundParams(fund.code);
                if (!params) return null;
                const pnl = fund.nav
                  ? ((fund.nav - params.costPrice) / params.costPrice) * 100
                  : 0;
                const distSL = params.sl
                  ? ((fund.nav - params.sl) / params.sl) * 100
                  : null;
                const distTP = params.tp
                  ? ((params.tp - fund.nav) / fund.nav) * 100
                  : null;
                const status = getStatus(fund.code, fund.nav, params, pnl);

                return (
                  <tr
                    key={fund.code}
                    className="border-t border-[#f3f4f6] hover:bg-[#f9fafb]"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-[#1f2937]">
                        {fund.name}
                      </span>
                      <span className="text-xs text-[#9ca3af] ml-1.5 font-mono">
                        {fund.code}
                      </span>
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono font-medium text-[#1f2937]">
                      {fund.nav ? fund.nav.toFixed(4) : '-'}
                    </td>
                    <td
                      className={`text-right px-3 py-2.5 font-mono font-medium ${
                        fund.change > 0
                          ? 'text-[#10b981]'
                          : fund.change < 0
                          ? 'text-[#ef4444]'
                          : 'text-[#6b7280]'
                      }`}
                    >
                      {fund.change > 0 ? '+' : ''}
                      {fund.change.toFixed(2)}%
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono text-[#6b7280]">
                      {params.costPrice.toFixed(4)}
                    </td>
                    <td
                      className={`text-right px-3 py-2.5 font-mono font-medium ${
                        pnl > 0
                          ? 'text-[#10b981]'
                          : pnl < 0
                          ? 'text-[#ef4444]'
                          : 'text-[#6b7280]'
                      }`}
                    >
                      {pnl > 0 ? '+' : ''}
                      {pnl.toFixed(2)}%
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${status.color}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${status.dotColor}`}
                        />
                        {status.label}
                      </span>
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono text-[#ef4444]/70 text-xs">
                      {params.sl ? params.sl.toFixed(4) : '-'}
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono text-[#10b981]/70 text-xs">
                      {params.tp ? params.tp.toFixed(4) : '-'}
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono text-xs text-[#6b7280]">
                      {distSL !== null ? `${distSL.toFixed(1)}%` : '-'}
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono text-xs text-[#6b7280]">
                      {distTP !== null ? `${distTP.toFixed(1)}%` : '-'}
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span className="text-xs text-[#6b7280]">
                        {params.role}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 功能标签页内容区 ===== */}
      <div className="px-5 py-4">
        {activeTab === 'overview' && (
          <DashboardOverview funds={funds} loading={loading} />
        )}
        {activeTab === 'buy' && <BuySignalPanel funds={funds} />}
        {activeTab === 'portfolio' && <PortfolioPanel funds={funds} />}
        {activeTab === 'learning' && <LearningPanel />}
        {activeTab === 'risk' && <RiskAlertPanel funds={funds} />}
        {activeTab === 'command' && <CommandPanel />}
      </div>
    </div>
  );
}

// 基金参数配置
interface FundParam {
  costPrice: number;
  sl: number | null;
  tp: number | null;
  tStop: string | null;
  buyZone: number[] | null;
  role: string;
}

function getFundParams(code: string): FundParam | null {
  const MAP: Record<string, FundParam> = {
    '012414': {
      costPrice: 1.4194,
      sl: null,
      tp: 1.5613,
      tStop: '回撤-5%减1/3;-8%再减1/3',
      buyZone: null,
      role: '盈利仓·保利润',
    },
    '019458': {
      costPrice: 1.495,
      sl: 1.3455,
      tp: 1.6744,
      tStop: null,
      buyZone: [1.42, 1.345],
      role: '被套仓·等回本',
    },
    '006020': {
      costPrice: 3.5577,
      sl: 3.2731,
      tp: 3.9135,
      tStop: '收盘<20MA减仓',
      buyZone: null,
      role: '备用金·不追加',
    },
    '015556': {
      costPrice: 1.0949,
      sl: 0.9635,
      tp: null,
      tStop: null,
      buyZone: [1.02],
      role: '底仓·观望',
    },
  };
  return MAP[code] || null;
}

function getStatus(
  code: string,
  nav: number,
  params: FundParam,
  pnl: number
) {
  // 华夏芯片：动态止盈回撤判断
  if (code === '012414') {
    if (pnl >= 10) return { label: '可止盈', color: 'text-[#10b981]', dotColor: 'bg-[#10b981]' };
    if (pnl >= 5) return { label: '持有', color: 'text-[#10b981]', dotColor: 'bg-[#10b981]' };
    return { label: '持有', color: 'text-[#6b7280]', dotColor: 'bg-[#6b7280]' };
  }
  // 触及止损
  if (params.sl && nav <= params.sl) {
    return { label: '认错', color: 'text-[#ef4444]', dotColor: 'bg-[#ef4444]' };
  }
  // 接近止损（距止损<5%）
  if (params.sl) {
    const distSL = ((nav - params.sl) / params.sl) * 100;
    if (distSL < 5) {
      return { label: '关注', color: 'text-[#f59e0b]', dotColor: 'bg-[#f59e0b]' };
    }
  }
  // 盈利
  if (pnl > 0) {
    return { label: '持有', color: 'text-[#10b981]', dotColor: 'bg-[#10b981]' };
  }
  return { label: '持有', color: 'text-[#6b7280]', dotColor: 'bg-[#6b7280]' };
}
