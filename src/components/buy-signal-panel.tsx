'use client';

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

// 买点规则定义
const BUY_RULES = [
  {
    fundCode: '159140',
    fundName: '科创创业AI ETF',
    tiers: [
      {
        tier: '黄金坑·第一买点',
        threshold: 1.37,
        desc: '5.12高点回调20%',
        position: '分2-3天买入12%总仓位',
        knowledge: '分批建仓铁律',
      },
      {
        tier: '钻石坑·第二买点',
        threshold: 1.28,
        desc: '回调25%',
        position: '一次性买入12%总仓位',
        knowledge: '历史极端行情应对',
      },
      {
        tier: '企稳满仓·第三买点',
        threshold: null,
        desc: '≥2项条件达标',
        position: '分2日补齐剩余24%',
        knowledge: '趋势确认理论',
      },
    ],
  },
  {
    fundCode: '022364',
    fundName: '永赢科技智选A',
    tiers: [
      {
        tier: '黄金坑·第一买点',
        threshold: 5.68,
        desc: '5.13高点回调20%',
        position: '5.85预埋2%，到位补满6%',
        knowledge: '不见兔子不撒鹰',
      },
      {
        tier: '钻石坑·第二买点',
        threshold: 5.33,
        desc: '回调25%',
        position: '同步买入6%，维持4:2比例',
        knowledge: '仓位配比纪律',
      },
    ],
  },
  {
    fundCode: '159142',
    fundName: '替代科创创业ETF',
    tiers: [
      {
        tier: '黄金坑·替代买点',
        threshold: 1.32,
        desc: '可替换159140',
        position: '仓位与159140一致',
        knowledge: '替代标的规则',
      },
    ],
  },
];

// 企稳满仓4项指标
const STABLE_CRITERIA = [
  { name: '连续3日阳线', current: '待复核' },
  { name: '成交量≥1.5倍20日均量', current: '待复核' },
  { name: '5/3日均线拐头', current: '待复核' },
  { name: '科创50站稳1200点', current: '待复核' },
];

export default function BuySignalPanel({ funds }: BuySignalPanelProps) {
  return (
    <div className="space-y-4">
      {/* 三档买点规则表 */}
      {BUY_RULES.map((rule) => {
        const fundData = funds.find((f) => f.code === rule.fundCode);
        const currentNav = fundData?.nav ?? 0;

        return (
          <div
            key={rule.fundCode}
            className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e7eb]">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1f2937]">
                  {rule.fundName}
                </h3>
                <span className="text-xs text-[#9ca3af] font-mono">
                  {rule.fundCode}
                </span>
              </div>
              {fundData && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#6b7280]">当前净值</span>
                  <span className="font-mono font-bold text-[#1f2937]">
                    {currentNav.toFixed(4)}
                  </span>
                  <span
                    className={`font-mono text-xs font-medium ${
                      fundData.change > 0
                        ? 'text-[#10b981]'
                        : fundData.change < 0
                        ? 'text-[#ef4444]'
                        : 'text-[#6b7280]'
                    }`}
                  >
                    {fundData.change > 0 ? '+' : ''}
                    {fundData.change.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f9fafb] text-[#6b7280] text-xs">
                  <th className="text-left px-4 py-2 font-medium">买点档位</th>
                  <th className="text-right px-3 py-2 font-medium">阈值</th>
                  <th className="text-right px-3 py-2 font-medium">当前净值</th>
                  <th className="text-left px-3 py-2 font-medium">说明</th>
                  <th className="text-left px-3 py-2 font-medium">建议仓位</th>
                  <th className="text-center px-3 py-2 font-medium">状态</th>
                  <th className="text-left px-3 py-2 font-medium">知识点</th>
                </tr>
              </thead>
              <tbody>
                {rule.tiers.map((tier, i) => {
                  const triggered =
                    tier.threshold !== null && currentNav > 0 && currentNav <= tier.threshold;

                  return (
                    <tr
                      key={i}
                      className="border-t border-[#f3f4f6] hover:bg-[#f9fafb]"
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-[#1f2937]">
                          {tier.tier}
                        </span>
                      </td>
                      <td className="text-right px-3 py-2.5 font-mono text-[#374151]">
                        {tier.threshold ? tier.threshold.toFixed(2) : '4项指标'}
                      </td>
                      <td className="text-right px-3 py-2.5 font-mono text-[#1f2937] font-medium">
                        {currentNav ? currentNav.toFixed(4) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#6b7280]">
                        {tier.desc}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#374151]">
                        {tier.position}
                      </td>
                      <td className="text-center px-3 py-2.5">
                        {triggered ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#10b981]">
                            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                            已触发
                          </span>
                        ) : (
                          <span className="text-xs text-[#9ca3af]">未触发</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#6366f1]">
                        {tier.knowledge}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* 企稳满仓4项指标复核 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">
            企稳满仓条件复核（≥2项达标方可执行）
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-4 gap-3">
            {STABLE_CRITERIA.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-[#f9fafb] border border-[#e5e7eb] text-center"
              >
                <p className="text-xs text-[#6b7280]">{item.name}</p>
                <p className="text-sm font-medium text-[#9ca3af] mt-1">
                  {item.current}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
