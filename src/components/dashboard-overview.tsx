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

// 入围涨幅板块 TOP5 次数统计（示例数据，可后续接入真实数据）
const SECTOR_TOP5 = [
  { rank: 1, sector: 'AI算力/光模块', count: 48, logic: '大模型训练需求爆发，算力基础设施扩张', repFund: '159140 科创AI' },
  { rank: 2, sector: '半导体/芯片', count: 42, logic: '国产替代+AI算力双重驱动', repFund: '012414 华夏芯片' },
  { rank: 3, sector: '机器人/具身智能', count: 35, logic: '政策扶持+量产预期，产业链上下游共振', repFund: '022364 永赢科技' },
  { rank: 4, sector: '新能源/储能', count: 28, logic: '海外需求回暖+国内政策刺激', repFund: '015556 博时新能源' },
  { rank: 5, sector: '消费电子/AR', count: 22, logic: '新品周期+AI终端落地预期', repFund: '159142 替代科创' },
];

// 年度涨幅领先主动基金
const TOP_FUNDS = [
  { name: '永赢科技智选A', code: '022364', ytd: '+38.5%', focus: 'AI算力·半导体' },
  { name: '华夏芯片联接A', code: '012414', ytd: '+32.1%', focus: '芯片·国产替代' },
  { name: '平安半导体精选C', code: '019458', ytd: '+18.7%', focus: '半导体·主动管理' },
];

export default function DashboardOverview({ funds, loading }: DashboardOverviewProps) {
  const [now, setNow] = useState<string>('');

  useEffect(() => {
    setNow(new Date().toLocaleString('zh-CN', { hour12: false }));
  }, []);

  // 买点触发汇总
  const buySignals = funds.filter((f) => {
    if (f.code === '159140' && f.nav <= 1.37) return true;
    if (f.code === '022364' && f.nav <= 5.68) return true;
    if (f.code === '159142' && f.nav <= 1.32) return true;
    return false;
  });

  // 预警汇总
  const alerts = funds.filter((f) => {
    if (f.code === '019458' && f.nav <= 1.3455) return true;
    return false;
  });

  return (
    <div className="space-y-4">
      {/* 市场板块分析 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">市场板块分析</h3>
          <span className="text-xs text-[#9ca3af]">
            统计自2026年1月1日起 · 入围涨幅TOP5次数
          </span>
        </div>

        <div className="grid grid-cols-3 gap-0">
          {/* 左侧：板块TOP5 */}
          <div className="col-span-2 p-4 border-r border-[#e5e7eb]">
            <div className="space-y-2.5">
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
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#6366f1]/10 text-[#6366f1] font-mono">
                        {item.count}次
                      </span>
                    </div>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      {item.logic}
                    </p>
                    <p className="text-xs text-[#9ca3af] mt-0.5">
                      代表：{item.repFund}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：年度领先基金 */}
          <div className="p-4">
            <h4 className="text-xs font-bold text-[#6b7280] mb-3">
              年度涨幅领先主动基金
            </h4>
            <div className="space-y-3">
              {TOP_FUNDS.map((fund) => (
                <div
                  key={fund.code}
                  className="p-3 rounded-lg bg-[#f9fafb] border border-[#e5e7eb]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1f2937]">
                      {fund.name}
                    </span>
                    <span className="text-sm font-mono font-bold text-[#10b981]">
                      {fund.ytd}
                    </span>
                  </div>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    {fund.code} · {fund.focus}
                  </p>
                </div>
              ))}
            </div>

            {/* 信号速览 */}
            <div className="mt-4 pt-3 border-t border-[#e5e7eb]">
              <h4 className="text-xs font-bold text-[#6b7280] mb-2">
                今日信号
              </h4>
              <div className="space-y-1.5">
                {buySignals.length > 0 ? (
                  buySignals.map((s) => (
                    <div
                      key={s.code}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                      <span className="text-[#10b981] font-medium">
                        {s.name} 买点触发
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-[#9ca3af]" />
                    <span className="text-[#9ca3af]">暂无买点触发</span>
                  </div>
                )}
                {alerts.length > 0 && alerts.map((a) => (
                  <div
                    key={a.code}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    <span className="text-[#ef4444] font-medium">
                      {a.name} 止损预警
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 源哥三大周期 + 铁律 + 半年周期提示 */}
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
