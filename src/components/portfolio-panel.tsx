'use client';

import { useState } from 'react';
import { FUNDS, DISCLAIMER } from '@/lib/constants';
import type { PortfolioRecord } from '@/lib/types';

export function PortfolioPanel() {
  const [records, setRecords] = useState<PortfolioRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    fundCode: '',
    action: 'buy' as PortfolioRecord['action'],
    nav: '',
    amount: '',
    notes: '',
  });

  const userHoldings = FUNDS.filter((f) => f.isUserHolding);
  const allFunds = FUNDS;

  // 模拟持仓数据 - 使用固定的模拟值避免渲染时调用Math.random
  const mockPortfolio = userHoldings.map((f, idx) => {
    const baseNavs: Record<string, number> = {
      '华夏芯片': 1.85,
      '平安半导体': 0.89,
      '宝盈转型': 2.15,
      '博时新能源': 1.05,
    };
    const currentNav = baseNavs[f.code] || 1.0;
    const profitRate = f.holding?.profitRate || 0;
    const costNav = currentNav / (1 + profitRate / 100);
    const fixedMarketValues = [35000, 18000, 25000, 12000];
    const fixedRatios = [35, 10, 15, 12];
    return {
      ...f,
      currentNav,
      costNav: Number(costNav.toFixed(4)),
      marketValue: fixedMarketValues[idx] ?? 10000,
      totalRatio: fixedRatios[idx] ?? 5,
    };
  });

  const totalAiWeight = 35 + 10; // 华夏芯片35% + 平安半导体10%
  const totalAssets = mockPortfolio.reduce((sum, p) => sum + (p.marketValue || 0), 0);

  const handleAddRecord = () => {
    if (!formData.fundCode || !formData.nav || !formData.amount) return;
    const newRecord: PortfolioRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      fundCode: formData.fundCode,
      action: formData.action,
      nav: Number(formData.nav),
      amount: Number(formData.amount),
      shares: Number((Number(formData.amount) / Number(formData.nav)).toFixed(2)),
      notes: formData.notes,
    };
    setRecords([newRecord, ...records]);
    setShowAddForm(false);
    setFormData({ fundCode: '', action: 'buy', nav: '', amount: '', notes: '' });
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-amber/90 font-medium">{DISCLAIMER}</p>

      {/* AI仓位总览 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <h2 className="text-sm font-medium text-foreground mb-3">AI主线仓位总览</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded bg-muted/20">
            <span className="text-[10px] text-muted-foreground">AI专属仓位占比</span>
            <p className={`text-xl font-mono font-bold ${totalAiWeight > 55 ? 'text-loss' : totalAiWeight > 45 ? 'text-amber' : 'text-profit'}`}>
              {totalAiWeight}%
            </p>
            <span className="text-[9px] text-muted-foreground">上限60%</span>
          </div>
          <div className="p-3 rounded bg-muted/20">
            <span className="text-[10px] text-muted-foreground">非AI仓位</span>
            <p className="text-xl font-mono font-bold text-foreground">{100 - totalAiWeight}%</p>
            <span className="text-[9px] text-muted-foreground">宝盈+博时</span>
          </div>
          <div className="p-3 rounded bg-muted/20">
            <span className="text-[10px] text-muted-foreground">持仓总市值</span>
            <p className="text-xl font-mono font-bold text-foreground">¥{totalAssets.toLocaleString()}</p>
            <span className="text-[9px] text-muted-foreground">4只自有基金</span>
          </div>
        </div>
        {/* 仓位条 */}
        <div className="mt-3">
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden flex">
            <div className="bg-amber h-full" style={{ width: '35%' }} title="华夏芯片 35%" />
            <div className="bg-indigo h-full" style={{ width: '10%' }} title="平安半导体 10%" />
            <div className="bg-muted-foreground/30 h-full" style={{ width: '15%' }} title="宝盈转型 15%" />
            <div className="bg-muted-foreground/20 h-full" style={{ width: '40%' }} title="博时新能源 40%" />
          </div>
          <div className="flex items-center gap-4 mt-2 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber" />华夏芯片 AI</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo" />平安半导体 AI</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/30" />宝盈 备用</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/20" />博时 非AI</span>
          </div>
        </div>
      </div>

      {/* 4只自有持仓明细 */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">自有持仓基金明细</h2>
        <div className="grid grid-cols-2 gap-4">
          {mockPortfolio.map((fund) => {
            const profitRate = fund.holding?.profitRate || 0;
            const isProfit = profitRate >= 0;
            const categoryLabel = fund.category === 'ai_semi' ? 'AI半导体' :
              fund.category === 'backup' ? '备用金' : '非AI底仓';
            const priorityLabel = fund.cycleRules?.priority === 'high' ? '赎回优先级：高' :
              fund.cycleRules?.priority === 'medium' ? '赎回优先级：中' : '赎回优先级：低';

            return (
              <div key={fund.code} className={`bg-card-bg rounded-lg p-4 border ${
                fund.category === 'ai_semi' ? 'border-amber/30' :
                fund.category === 'backup' ? 'border-loss/30' : 'border-border'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-foreground">{fund.shortName}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 font-mono">{fund.code}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    fund.category === 'ai_semi' ? 'bg-amber/20 text-amber' :
                    fund.category === 'backup' ? 'bg-loss/20 text-loss' : 'bg-muted/50 text-muted-foreground'
                  }`}>{categoryLabel}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <span className="text-[9px] text-muted-foreground">当前净值</span>
                    <p className="text-sm font-mono text-foreground">{fund.currentNav?.toFixed(4)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground">成本净值</span>
                    <p className="text-sm font-mono text-foreground">{fund.costNav?.toFixed(4)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground">浮盈亏</span>
                    <p className={`text-sm font-mono font-bold ${isProfit ? 'text-profit' : 'text-loss'}`}>
                      {isProfit ? '+' : ''}{profitRate}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground">持仓市值</span>
                    <p className="text-sm font-mono text-foreground">¥{fund.marketValue?.toLocaleString()}</p>
                  </div>
                </div>

                {/* 半年周期特别提示 */}
                <div className="pt-3 border-t border-border/50">
                  <p className="text-[9px] text-amber mb-1 font-medium">半年周期特别提示：</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{fund.cycleRules?.notes}</p>
                  {fund.cycleRules?.priority && (
                    <p className="text-[9px] text-indigo mt-1">{priorityLabel}</p>
                  )}
                  {fund.cycleRules?.canAddPosition === false && (
                    <p className="text-[9px] text-loss mt-1">禁止追加资金</p>
                  )}
                </div>

                {/* 止盈止损标记 */}
                <div className="flex gap-2 mt-2">
                  {fund.cycleRules?.stopProfitThreshold && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-profit/10 text-profit">
                      止盈线+{fund.cycleRules.stopProfitThreshold}%
                    </span>
                  )}
                  {fund.cycleRules?.stopLossThreshold && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-loss/10 text-loss">
                      止损线-{fund.cycleRules.stopLossThreshold}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 操作记录 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">操作记录</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 text-[10px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
          >
            {showAddForm ? '取消' : '+ 记录操作'}
          </button>
        </div>

        {showAddForm && (
          <div className="p-3 rounded bg-muted/20 border border-border mb-3">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[9px] text-muted-foreground">基金</label>
                <select
                  value={formData.fundCode}
                  onChange={(e) => setFormData({ ...formData, fundCode: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 text-xs bg-card-bg border border-border rounded text-foreground"
                >
                  <option value="">选择基金</option>
                  {allFunds.map((f) => (
                    <option key={f.code} value={f.code}>{f.shortName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">操作</label>
                <select
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value as PortfolioRecord['action'] })}
                  className="w-full mt-1 px-2 py-1.5 text-xs bg-card-bg border border-border rounded text-foreground"
                >
                  <option value="buy">买入</option>
                  <option value="sell">卖出</option>
                  <option value="add">加仓</option>
                  <option value="reduce">减仓</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">金额</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="金额"
                  className="w-full mt-1 px-2 py-1.5 text-xs bg-card-bg border border-border rounded text-foreground font-mono"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="备注"
                  className="w-full px-2 py-1.5 text-xs bg-card-bg border border-border rounded text-foreground"
                />
              </div>
              <button
                onClick={handleAddRecord}
                className="px-4 py-1.5 text-[10px] rounded bg-primary text-primary-foreground hover:bg-primary/90"
              >
                确认
              </button>
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">暂无操作记录，点击上方按钮添加</p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded bg-muted/10">
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    r.action === 'buy' || r.action === 'add' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
                  }`}>
                    {r.action === 'buy' ? '买入' : r.action === 'sell' ? '卖出' : r.action === 'add' ? '加仓' : '减仓'}
                  </span>
                  <span className="text-xs text-foreground">{r.fundCode}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">¥{r.amount}</span>
                </div>
                <div className="flex items-center gap-2">
                  {r.notes && <span className="text-[10px] text-muted-foreground">{r.notes}</span>}
                  <span className="text-[10px] text-muted-foreground font-mono">{r.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 止盈止损铁律 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">止盈 & 止损铁律</h3>
        <div className="space-y-2 text-[10px]">
          {[
            { rule: '分批建仓：备用资金分3批投入，禁止梭哈', link: '3-3-4建仓法' },
            { rule: '追高拦截：159140>1.37、022364>5.68劝阻新开仓', link: '追高是亏损根源' },
            { rule: '浮亏止损：平安半导体亏至20%立刻停补仓', link: '价格止损铁律' },
            { rule: '6个月时间止损：11月未创新高AI仓位压至20%以下', link: '时间止损铁律' },
            { rule: '极端风控：优先赎回宝盈/新能源，AI总仓位上限30%', link: '极端行情应对' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/10">
              <span className="text-loss shrink-0">●</span>
              <div>
                <span className="text-foreground">{item.rule}</span>
                <span className="text-indigo ml-1">[{item.link}]</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
