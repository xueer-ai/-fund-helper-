'use client';

import { useState, useEffect } from 'react';

interface FundData {
  code: string;
  name: string;
  nav: number;
  lastNav: number;
  change: number;
}

interface BuySignalPanelProps {
  funds: FundData[];
}

// 买点配置
const BUY_SIGNALS = [
  { fund: '科创AI', code: '159140', tier: '黄金坑第一买点', tierColor: 'text-[#b45309]', threshold: 1.37, position: '净值≤1.37，回调约20%，分2-3天买入总计划仓位12%', knowledge: '分批建仓铁律' },
  { fund: '科创AI', code: '159140', tier: '钻石坑第二买点', tierColor: 'text-[#dc2626]', threshold: 1.28, position: '净值≤1.28，回调约25%，全年超跌机会，一次性买入12%（2-3天买入）', knowledge: '历史极端行情应对' },
  { fund: '替代ETF', code: '159142', tier: '黄金坑第一买点', tierColor: 'text-[#b45309]', threshold: 1.32, position: '净值≤1.32，回调约20%，分2-3天买入总计划仓位12%', knowledge: '分批建仓铁律' },
  { fund: '永赢科技', code: '022364', tier: '黄金坑第一买点', tierColor: 'text-[#b45309]', threshold: 5.68, position: '净值≤5.68，5.85预埋2%，到位补满6%尾盘操作', knowledge: '分批建仓铁律' },
  { fund: '永赢科技', code: '022364', tier: '钻石坑第二买点', tierColor: 'text-[#dc2626]', threshold: 5.33, position: '净值≤5.33，同步买入6%，维持4:2仓位比例', knowledge: '历史极端行情应对' },
];

// 企稳满仓4项指标
const STABLE_CRITERIA = [
  { name: '连续3根阳线', desc: '近3个交易日收盘价连续上升' },
  { name: '成交量≥1.5倍20日均量', desc: '当日成交量突破20日均线1.5倍' },
  { name: '5日/3日均线拐头', desc: '短期均线由下转上' },
  { name: '科创50站稳1200点', desc: '科创50指数收盘≥1200' },
];

export default function BuySignalPanel({ funds }: BuySignalPanelProps) {
  return (
    <div className="space-y-4">
      {/* 免责声明 */}
      <div className="bg-[#fff7ed] rounded-lg border border-[#fed7aa] px-4 py-2">
        <p className="text-xs text-[#9a3412]">
          ▲ 重要提示: 内容仅为逻辑推演复盘, 不构成任何基金、理财投资建议, 市场有波动, 入市需谨慎
        </p>
      </div>

      {/* 买点监控表格 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">
            <span className="text-[#dc2626] font-bold">◆</span> 买点监控
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f9fafb] text-[#6b7280] text-xs">
                <th className="px-3 py-2 text-left font-medium">基金</th>
                <th className="px-3 py-2 text-left font-medium">档位</th>
                <th className="px-3 py-2 text-right font-medium">阈值</th>
                <th className="px-3 py-2 text-right font-medium">当前净值</th>
                <th className="px-3 py-2 text-center font-medium">状态</th>
                <th className="px-3 py-2 text-left font-medium">建议仓位</th>
                <th className="px-3 py-2 text-left font-medium">知识点</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {BUY_SIGNALS.map((sig, i) => {
                const fund = funds.find((f) => f.code === sig.code);
                const currentNav = fund?.nav ?? 0;
                const triggered = currentNav > 0 && currentNav <= sig.threshold;

                return (
                  <tr key={i} className={triggered ? 'bg-[#10b981]/5' : 'hover:bg-[#f9fafb]'}>
                    <td className="px-3 py-2.5 font-medium text-[#1f2937]">{sig.fund}</td>
                    <td className={`px-3 py-2.5 font-medium ${sig.tierColor}`}>{sig.tier}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#92400e] font-medium">{sig.threshold.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#1f2937]">
                      {currentNav > 0 ? currentNav.toFixed(4) : '--'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {triggered ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[#10b981] text-white font-medium">
                          已触发
                        </span>
                      ) : (
                        <span className="text-xs text-[#9ca3af]">未触发</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#4b5563] max-w-xs">{sig.position}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-medium ${
                        sig.knowledge === '历史极端行情应对' ? 'text-[#6366f1]' : 'text-[#818cf8]'
                      }`}>
                        {sig.knowledge}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 追高拦截铁律 */}
      <div className="bg-[#ef4444] rounded-lg px-4 py-3">
        <h3 className="text-sm font-bold text-white mb-2">追高拦截铁律</h3>
        <ul className="space-y-1.5">
          <li className="text-xs text-white/90">
            • 159140（科创AI）{'>'} 1.37 → 劝阻一切新开仓
          </li>
          <li className="text-xs text-white/90">
            • 022364（永赢科技）{'>'} 5.68 → 劝阻一切新开仓（含自有基金腾挪资金）
          </li>
          <li className="text-xs text-white/80">
            • 关联学习：追高是亏损根源
          </li>
        </ul>
      </div>

      {/* 企稳满仓条件复核 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">
            企稳满仓条件复核（≥2项达标方可执行）
          </h3>
        </div>
        <div className="grid grid-cols-4 gap-0 divide-x divide-[#e5e7eb]">
          {STABLE_CRITERIA.map((c, i) => (
            <div key={i} className="p-3 text-center">
              <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-[#9ca3af]/10 text-xs font-medium text-[#9ca3af]">
                {i + 1}
              </span>
              <p className="text-xs font-medium text-[#1f2937] mt-1.5">{c.name}</p>
              <p className="text-[10px] text-[#9ca3af] mt-0.5">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
