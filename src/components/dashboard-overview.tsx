'use client';

import { useState, useEffect } from 'react';

interface FundData {
  code: string;
  name: string;
  nav: number;
  lastNav: number;
  change: number;
}

interface DashboardOverviewProps {
  funds: FundData[];
  loading: boolean;
}

// 入围涨幅板块 TOP5 次数统计（2026年1月1日起算，每天累计）
const SECTOR_TOP5 = [
  {
    rank: 1,
    sector: '通信（光模块/AI算力）',
    count: 4,
    months: '1月、3月、4月、5月',
    logic: '全球AI算力需求爆发，光模块订单排至2028年',
    repFunds: '华商均衡成长(011369)、财通多策略福鑫',
  },
  {
    rank: 2,
    sector: '电子（半导体/PCB）',
    count: 3,
    months: '1月、3月、4月、5月',
    logic: '国产替代加速+存储芯片周期反转',
    repFunds: '财通集成电路产业(006502)、华夏国证半导体芯片ETF联接A(008887)',
  },
  {
    rank: 3,
    sector: '有色金属（黄金/小金属）',
    count: 3,
    months: '1月、2月、5月',
    logic: '大宗商品价格上涨+避险需求',
    repFunds: '黄金股ETF(517400)、有色金属ETF大成(159980)',
  },
  {
    rank: 4,
    sector: '公用事业（电力/煤炭）',
    count: 2,
    months: '5月',
    logic: '夏季用电高峰+AI数据中心耗电激增',
    repFunds: '',
  },
  {
    rank: 5,
    sector: '计算机（AI应用）',
    count: 2,
    months: '3月、4月',
    logic: 'AI模型商业化落地加速',
    repFunds: '',
  },
];

// 年度涨幅领先主动基金
const TOP_FUNDS = [
  { name: '华商均衡成长', code: '011369', ytd: '+101.73%', focus: '重仓光模块' },
  { name: '财通多策略福鑫', code: '--', ytd: '+101.19%', focus: '重仓半导体设备与PCB' },
  { name: '财通系5只基金(金梓才管理)', code: '--', ytd: '87%-98%', focus: '前五个月收益区间' },
];

// 持仓基金参数
const HOLDING_PARAMS: Record<string, {
  name: string;
  costPrice: number;
  sl: number;
  tp: number | null;
  slPct: string;
  tpPct: string | null;
  role: string;
}> = {
  '012414': { name: '华夏芯片', costPrice: 1.4194, sl: 1.1355, tp: 1.5613, slPct: '-20.0%', tpPct: '+10.0%', role: '右侧盈利-要保利润' },
  '019458': { name: '平安半导体', costPrice: 1.4950, sl: 1.3455, tp: 1.6744, slPct: '-10.0%', tpPct: '+12.0%', role: '左侧被套-波动大' },
  '005536': { name: '宝盈转型', costPrice: 3.5577, sl: 3.2731, tp: 3.9135, slPct: '-8.0%', tpPct: '+10.0%', role: '趋势跟随-均衡灵活' },
  '015556': { name: '博时新能源', costPrice: 1.0949, sl: 0.9635, tp: null, slPct: '-12.0%', tpPct: null, role: '主题周期-平本附近' },
};

export default function DashboardOverview({ funds, loading }: DashboardOverviewProps) {
  const [now, setNow] = useState<string>('');

  useEffect(() => {
    setNow(new Date().toLocaleString('zh-CN', { hour12: false }));
  }, []);

  // 计算持仓表格数据
  const holdingRows = Object.entries(HOLDING_PARAMS).map(([code, params]) => {
    const fund = funds.find((f) => f.code === code);
    const nav = fund?.nav ?? params.costPrice;
    const change = fund?.change ?? 0;
    const pnlPct = ((nav - params.costPrice) / params.costPrice) * 100;
    const distSL = params.sl > 0 ? ((nav - params.sl) / params.sl) * 100 : NaN;
    const distTP = params.tp && params.tp > 0 ? ((params.tp - nav) / nav) * 100 : NaN;

    let status = '持有';
    let statusColor = 'bg-[#10b981]';
    if (params.tp && nav >= params.tp) {
      status = '可止盈';
      statusColor = 'bg-[#10b981]';
    } else if (nav <= params.sl) {
      status = '认错';
      statusColor = 'bg-[#ef4444]';
    } else if (params.role.includes('被套') && pnlPct < -5) {
      status = '认错';
      statusColor = 'bg-[#ef4444]';
    } else if (distSL >= 0 && distSL < 10) {
      status = '关注';
      statusColor = 'bg-[#f59e0b]';
    }

    return {
      code,
      ...params,
      nav,
      change,
      pnlPct,
      distSL,
      distTP,
      status,
      statusColor,
    };
  });

  return (
    <div className="space-y-4">
      {/* ===== 入围涨幅板块 TOP5 次数 ===== */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">
            <span className="text-[#dc2626] font-bold">◆</span> 入围涨幅板块top5次数:
            <span className="font-normal text-[#6b7280] ml-1">（2026年1月1日起算，每天累计）</span>
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-0">
          {/* 左侧：板块TOP5 */}
          <div className="col-span-2 p-4 border-r border-[#e5e7eb]">
            <div className="space-y-3">
              {SECTOR_TOP5.map((item) => (
                <div
                  key={item.rank}
                  className="flex items-start gap-3 py-2 border-b border-[#f3f4f6] last:border-b-0"
                >
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      item.rank <= 3 ? 'bg-[#6366f1]' : 'bg-[#9ca3af]'
                    }`}
                  >
                    {item.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1f2937] text-sm">
                        {item.sector}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#6366f1]/10 text-[#6366f1] font-mono font-medium">
                        入围{item.count}次（{item.months}）
                      </span>
                    </div>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      核心驱动：{item.logic}
                    </p>
                    {item.repFunds && (
                      <p className="text-xs text-[#9ca3af] mt-0.5">
                        代表基金：{item.repFunds}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：年度领先基金 */}
          <div className="p-4">
            <h4 className="text-xs font-bold text-[#6b7280] mb-1">
              年度涨幅领先的主动基金
            </h4>
            <p className="text-[10px] text-[#9ca3af] mb-3">
              截至2026年5月31日，主动权益类基金中：
            </p>
            <div className="space-y-3">
              {TOP_FUNDS.map((fund, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-[#f9fafb] border border-[#e5e7eb]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1f2937]">
                      {fund.name}{fund.code !== '--' && `(${fund.code})`}
                    </span>
                    <span className="text-sm font-mono font-bold text-[#10b981]">
                      {fund.ytd}
                    </span>
                  </div>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    {fund.focus}
                  </p>
                </div>
              ))}
            </div>

            {/* 信号速览 */}
            <div className="mt-4 pt-3 border-t border-[#e5e7eb]">
              <h4 className="text-xs font-bold text-[#6b7280] mb-2">今日信号</h4>
              <div className="space-y-1.5">
                {(() => {
                  const buySigs = funds.filter((f) => {
                    if (f.code === '159140' && f.nav <= 1.37) return true;
                    if (f.code === '022364' && f.nav <= 5.68) return true;
                    if (f.code === '159142' && f.nav <= 1.32) return true;
                    return false;
                  });
                  const alertFunds = funds.filter((f) => {
                    if (f.code === '019458' && f.nav <= 1.3455) return true;
                    return false;
                  });
                  return (
                    <>
                      {buySigs.length > 0 ? buySigs.map((s) => (
                        <div key={s.code} className="flex items-center gap-2 text-xs">
                          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                          <span className="text-[#10b981] font-medium">{s.name} 买点触发</span>
                        </div>
                      )) : (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-2 h-2 rounded-full bg-[#9ca3af]" />
                          <span className="text-[#9ca3af]">暂无买点触发</span>
                        </div>
                      )}
                      {alertFunds.map((a) => (
                        <div key={a.code} className="flex items-center gap-2 text-xs">
                          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                          <span className="text-[#ef4444] font-medium">{a.name} 止损预警</span>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 我的持仓表格 ===== */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">我的持仓</h3>
          <span className="text-xs text-[#9ca3af]">成本/止损/止盈均为参考线，不构成投资建议</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f9fafb] text-[#6b7280] text-xs">
                <th className="px-3 py-2 text-left font-medium">基金</th>
                <th className="px-3 py-2 text-right font-medium">成本价</th>
                <th className="px-3 py-2 text-right font-medium">当前净值</th>
                <th className="px-3 py-2 text-right font-medium">今日涨跌</th>
                <th className="px-3 py-2 text-right font-medium">浮盈亏</th>
                <th className="px-3 py-2 text-center font-medium">状态</th>
                <th className="px-3 py-2 text-right font-medium">止损线</th>
                <th className="px-3 py-2 text-right font-medium">止盈线</th>
                <th className="px-3 py-2 text-right font-medium">距止损</th>
                <th className="px-3 py-2 text-right font-medium">距止盈</th>
                <th className="px-3 py-2 text-left font-medium">角色</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {holdingRows.map((row) => (
                <tr key={row.code} className="hover:bg-[#f9fafb]">
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-[#1f2937]">{row.name}</span>
                    <span className="text-xs text-[#9ca3af] ml-1">{row.code}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[#4b5563]">
                    {row.costPrice.toFixed(4)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-medium text-[#1f2937]">
                    {row.nav.toFixed(4)}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono ${row.change >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {row.change >= 0 ? '+' : ''}{row.change.toFixed(2)}%
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono font-medium ${row.pnlPct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {row.pnlPct >= 0 ? '+' : ''}{row.pnlPct.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white font-medium ${row.statusColor}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[#ef4444] text-xs">
                    {row.sl.toFixed(4)}
                    <span className="text-[#9ca3af] ml-0.5">{row.slPct}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[#10b981] text-xs">
                    {row.tp ? `${row.tp.toFixed(4)}` : '--'}
                    {row.tpPct && <span className="text-[#9ca3af] ml-0.5">{row.tpPct}</span>}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono text-xs ${row.distSL >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {isNaN(row.distSL) ? '--' : `${row.distSL.toFixed(1)}%`}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono text-xs ${row.distTP !== null && row.distTP <= 0 ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
                    {row.distTP !== null && !isNaN(row.distTP) ? `${row.distTP.toFixed(1)}%` : '--'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[#6b7280]">
                    {row.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 源哥三大周期 + 铁律 + 半年周期提示 ===== */}
      <div className="grid grid-cols-3 gap-4">
        {/* 三大周期 */}
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
            <h3 className="text-sm font-bold text-[#1f2937]">源哥三大周期</h3>
          </div>
          <div className="p-4 space-y-2.5">
            <div className="flex items-start gap-2">
              <span className="text-xs font-mono text-[#6366f1] font-bold mt-0.5">01</span>
              <div>
                <p className="text-sm font-medium text-[#1f2937]">AI科技主线周期</p>
                <p className="text-xs text-[#6b7280]">当前处于上升周期，关注算力与应用端</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs font-mono text-[#6366f1] font-bold mt-0.5">02</span>
              <div>
                <p className="text-sm font-medium text-[#1f2937]">美联储加息周期</p>
                <p className="text-xs text-[#6b7280]">降息预期延后，关注9月议息会议</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs font-mono text-[#6366f1] font-bold mt-0.5">03</span>
              <div>
                <p className="text-sm font-medium text-[#1f2937]">大宗商品/油价周期</p>
                <p className="text-xs text-[#6b7280]">油价中枢下移，通胀压力暂缓</p>
              </div>
            </div>
          </div>
        </div>

        {/* 投资铁律 */}
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
            <h3 className="text-sm font-bold text-[#1f2937]">投资铁律</h3>
          </div>
          <div className="p-4 space-y-1.5">
            {[
              '不见兔子不撒鹰 · 严格按触发条件执行',
              '分批建仓3-3-4 · 杜绝一次性满仓',
              '追高是亏损根源 · 严守净值红线',
              '时间止损>价格止损 · 11月节点',
              '卖的5大层次 · 从情绪到规则',
              '流动性资产核心 · 现金守恒定律',
              '极端风控优先 · 宝盈/新能源先行',
            ].map((rule, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] flex-shrink-0" />
                <span className="text-[#374151]">{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 半年周期提示 */}
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
            <h3 className="text-sm font-bold text-[#1f2937]">半年周期 · 5.29-11月</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="p-2.5 rounded bg-[#6366f1]/5 border border-[#6366f1]/20">
              <p className="text-xs font-medium text-[#6366f1]">当前阶段：布局期</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                5.29起分批建仓，耐心等待黄金坑信号
              </p>
            </div>
            <div className="p-2.5 rounded bg-[#f59e0b]/5 border border-[#f59e0b]/20">
              <p className="text-xs font-medium text-[#92400e]">国庆窗口：止盈期</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                国庆前后分批兑现，锁定40-60%收益
              </p>
            </div>
            <div className="p-2.5 rounded bg-[#ef4444]/5 border border-[#ef4444]/20">
              <p className="text-xs font-medium text-[#ef4444]">11月节点：止损收尾</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                未创新高则压缩AI仓位至20%以下，非AI全清
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
