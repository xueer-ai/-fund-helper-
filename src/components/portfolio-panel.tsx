'use client';

import { useState, useEffect } from 'react';
import { FUNDS, DISCLAIMER } from '@/lib/constants';
import type { PortfolioRecord, FundPriceParams } from '@/lib/types';

/** 根据当前净值和priceParams判断状态灯 */
function getStatusLight(currentNav: number, params: FundPriceParams): { color: 'green' | 'yellow' | 'red'; label: string; detail: string } {
  // 检查硬止损 SL（红线）
  if (currentNav <= params.sl) {
    return {
      color: 'red',
      label: '🔴 认错警戒',
      detail: `已触及-硬止损线 ¥${params.sl.toFixed(4)}，建议核对收盘价是否有效跌破；若是→执行减仓/清仓计划`,
    };
  }

  // 动态止盈回撤 T-Stop（紫线，只对盈利仓）
  if (params.tStop?.enabled && params.tStop.levels.length > 0) {
    // 这里简化处理：用当前净值与成本价对比估算回撤
    // 实际应从最高点计算，这里用成本价*(1+利润率)近似
    const profitRate = (currentNav - params.costPrice) / params.costPrice * 100;
    if (profitRate > 0) {
      // 有盈利，检查回撤
      // 用最严格的条件检查（这里简化：如果有tStop规则，按规则显示）
      const highestLevel = params.tStop.levels[params.tStop.levels.length - 1];
      if (highestLevel) {
        // 如果当前净值低于成本+5%以上区域，可能是回撤中
        const cushion = (currentNav - params.costPrice) / params.costPrice * 100;
        if (cushion >= 0 && cushion < 5) {
          return {
            color: 'yellow',
            label: '🟡 接近减仓区',
            detail: params.tStop.levels[0]?.action || '从高点回撤接近阈值，准备好挂单价',
          };
        }
      }
    }
  }

  // 检查是否接近SL（黄色警告）
  const slDistance = (currentNav - params.sl) / params.sl * 100;
  if (slDistance < 5) {
    return {
      color: 'yellow',
      label: '🟡 接近止损区',
      detail: `距硬止损线仅 ${slDistance.toFixed(1)}%，请提高警惕`,
    };
  }

  // 检查TP距离
  if (params.tp) {
    const tpDistance = (params.tp - currentNav) / currentNav * 100;
    return {
      color: 'green',
      label: '🟢 持有',
      detail: `距止盈还差 ${tpDistance.toFixed(1)}%；距止损还有 ${slDistance.toFixed(1)}% 缓冲`,
    };
  }

  return {
    color: 'green',
    label: '🟢 持有',
    detail: `距止损还有 ${slDistance.toFixed(1)}% 缓冲`,
  };
}

const STATUS_STYLES = {
  green: 'border-profit/40 bg-profit/5',
  yellow: 'border-gold/40 bg-gold/5',
  red: 'border-loss/40 bg-loss/5 animate-pulse',
};

const STATUS_TAG_STYLES = {
  green: 'bg-profit/20 text-profit',
  yellow: 'bg-gold/20 text-gold',
  red: 'bg-loss/20 text-loss',
};

export function PortfolioPanel() {
  const [records, setRecords] = useState<PortfolioRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [navData, setNavData] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    fundCode: '',
    action: 'buy' as PortfolioRecord['action'],
    nav: '',
    amount: '',
    notes: '',
  });

  const userHoldings = FUNDS.filter((f) => f.isUserHolding);
  const allFunds = FUNDS;

  // 获取实时净值
  useEffect(() => {
    const fetchNav = async () => {
      try {
        const res = await fetch('/api/fund-data?all=1');
        const data = await res.json();
        const map: Record<string, number> = {};
        if (data.funds) {
          for (const f of data.funds) {
            if (f.nav > 0) map[f.code] = f.nav;
          }
        }
        setNavData(map);
      } catch {
        // fallback to empty
      }
    };
    fetchNav();
    const timer = setInterval(fetchNav, 30000);
    return () => clearInterval(timer);
  }, []);

  // 构建持仓数据
  const portfolio = userHoldings.map((f) => {
    const baseNavs: Record<string, number> = {
      '华夏芯片': 2.05,
      '平安半导体': 1.34,
      '宝盈转型': 4.15,
      '博时新能源': 1.09,
    };
    const currentNav = navData[f.code] || baseNavs[f.code] || 1.0;
    const params = f.priceParams;
    const costPrice = params?.costPrice || f.holding?.costNav || currentNav;
    const profitRate = ((currentNav - costPrice) / costPrice * 100);
    const fixedMarketValues: Record<string, number> = {
      '华夏芯片': 35000,
      '平安半导体': 18000,
      '宝盈转型': 25000,
      '博时新能源': 12000,
    };
    return {
      ...f,
      currentNav,
      costPrice,
      profitRate: Number(profitRate.toFixed(2)),
      marketValue: fixedMarketValues[f.code] || 10000,
      params: params!,
      status: params ? getStatusLight(currentNav, params) : { color: 'green' as const, label: '🟢 持有', detail: '' },
    };
  });

  const totalAiWeight = 35 + 10;
  const totalAssets = portfolio.reduce((sum, p) => sum + (p.marketValue || 0), 0);

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
      <p className="text-xs text-gold/90 font-medium">{DISCLAIMER}</p>

      {/* AI仓位总览 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <h2 className="text-sm font-medium text-foreground mb-3">AI主线仓位总览</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded bg-muted/20">
            <span className="text-xs text-muted-foreground">AI专属仓位占比</span>
            <p className={`text-xl font-mono font-bold ${totalAiWeight > 55 ? 'text-loss' : totalAiWeight > 45 ? 'text-gold' : 'text-profit'}`}>
              {totalAiWeight}%
            </p>
            <span className="text-[11px] text-muted-foreground">上限60%</span>
          </div>
          <div className="p-3 rounded bg-muted/20">
            <span className="text-xs text-muted-foreground">非AI仓位</span>
            <p className="text-xl font-mono font-bold text-foreground">{100 - totalAiWeight}%</p>
            <span className="text-[11px] text-muted-foreground">宝盈+博时</span>
          </div>
          <div className="p-3 rounded bg-muted/20">
            <span className="text-xs text-muted-foreground">持仓总市值</span>
            <p className="text-xl font-mono font-bold text-foreground">¥{totalAssets.toLocaleString()}</p>
            <span className="text-[11px] text-muted-foreground">4只自有基金</span>
          </div>
        </div>
        {/* 仓位条 */}
        <div className="mt-3">
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden flex">
            <div className="bg-gold h-full" style={{ width: '35%' }} title="华夏芯片 35%" />
            <div className="bg-indigo h-full" style={{ width: '10%' }} title="平安半导体 10%" />
            <div className="bg-muted-foreground/30 h-full" style={{ width: '15%' }} title="宝盈转型 15%" />
            <div className="bg-muted-foreground/20 h-full" style={{ width: '40%' }} title="博时新能源 40%" />
          </div>
        </div>
      </div>

      {/* 4只自有持仓明细 — 含关键价位线 */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">自有持仓基金 — 关键价位版</h2>
        <div className="grid grid-cols-2 gap-4">
          {portfolio.map((fund) => {
            if (!fund.params) return null;
            const { params, status } = fund;
            const isProfit = fund.profitRate >= 0;

            return (
              <div key={fund.code} className={`bg-card-bg rounded-lg p-4 border ${STATUS_STYLES[status.color]}`}>
                {/* 头部：名称+角色+状态灯 */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-foreground">{fund.name}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">{params.role}</span>
                  </div>
                  <span className={`text-[11px] px-2 py-1 rounded font-medium ${STATUS_TAG_STYLES[status.color]}`}>
                    {status.label}
                  </span>
                </div>

                {/* 状态详情 */}
                {status.detail && (
                  <div className={`text-xs mb-3 px-2 py-1.5 rounded ${
                    status.color === 'red' ? 'bg-loss/10 text-loss' :
                    status.color === 'yellow' ? 'bg-gold/10 text-gold' : 'bg-profit/10 text-profit'
                  }`}>
                    {status.detail}
                  </div>
                )}

                {/* 关键价位线 */}
                <div className="space-y-1.5 mb-3">
                  {/* 蓝线：成本 */}
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-blue-400 rounded" />
                    <span className="text-[11px] text-blue-400 w-14">成本线</span>
                    <span className="text-xs font-mono text-foreground">¥{params.costPrice.toFixed(4)}</span>
                    <span className="text-[11px] text-muted-foreground">（锚）</span>
                  </div>
                  {/* 紫线：TP止盈 */}
                  {params.tp && (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-purple-400 rounded" />
                      <span className="text-[11px] text-purple-400 w-14">止盈TP</span>
                      <span className="text-xs font-mono text-foreground">¥{params.tp.toFixed(4)}</span>
                      <span className="text-[11px] text-profit">+{((params.tp - params.costPrice) / params.costPrice * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  {/* 红线：SL硬止损 */}
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-red-400 rounded" />
                    <span className="text-[11px] text-red-400 w-14">硬止损SL</span>
                    <span className="text-xs font-mono text-foreground">¥{params.sl.toFixed(4)}</span>
                    <span className="text-[11px] text-loss">{((params.sl - params.costPrice) / params.costPrice * 100).toFixed(1)}%</span>
                  </div>
                  {/* 绿线：BuyZone补仓 */}
                  {params.buyZone?.enabled && params.buyZone.levels.map((bz, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-emerald-400 rounded" />
                      <span className="text-[11px] text-emerald-400 w-14">{bz.label}</span>
                      <span className="text-xs font-mono text-foreground">¥{bz.price.toFixed(4)}</span>
                    </div>
                  ))}
                  {/* 紫线：动态止盈回撤规则 */}
                  {params.tStop?.enabled && params.tStop.levels.map((ts, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-purple-300 rounded" />
                      <span className="text-[11px] text-purple-300 w-14">回撤{ts.dropPct}%</span>
                      <span className="text-[11px] text-muted-foreground">{ts.action}</span>
                    </div>
                  ))}
                </div>

                {/* 净值+浮盈亏 */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
                  <div>
                    <span className="text-[11px] text-muted-foreground">当前净值</span>
                    <p className="text-sm font-mono text-foreground">{fund.currentNav?.toFixed(4)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">浮盈亏</span>
                    <p className={`text-sm font-mono font-bold ${isProfit ? 'text-profit' : 'text-loss'}`}>
                      {isProfit ? '+' : ''}{fund.profitRate}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">距SL缓冲</span>
                    <p className={`text-sm font-mono font-bold ${
                      ((fund.currentNav - params.sl) / params.sl * 100) < 5 ? 'text-loss' : 'text-foreground'
                    }`}>
                      {((fund.currentNav - params.sl) / params.sl * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* 补仓闸门状态 */}
                <div className="mt-2 pt-2 border-t border-border/30">
                  {params.minBuyIntervalDays >= 999 ? (
                    <span className="text-[11px] text-loss">🔒 补仓闸门关闭 — {params.buyZone?.extraConditions?.[0] || '当前阶段不建议加仓'}</span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      闸门条件：间距≥{params.minBuyIntervalDays}交易日{params.minBuyDropPct ? ` + 再跌${params.minBuyDropPct}%` : ''}
                    </span>
                  )}
                  {params.buyZone?.extraConditions?.filter((_, i) => i > 0 || params.minBuyIntervalDays < 999).map((cond, i) => (
                    <p key={i} className="text-[11px] text-gold mt-0.5">⚠ {cond}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 补仓间距规则提示 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <h3 className="text-sm font-medium text-foreground mb-2">补仓纪律参数</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded bg-muted/20">
            <span className="text-[11px] text-muted-foreground">最短补仓间隔</span>
            <p className="text-sm font-mono text-gold">≥ 10个交易日（≈2周）</p>
          </div>
          <div className="p-2 rounded bg-muted/20">
            <span className="text-[11px] text-muted-foreground">补仓跌幅门槛</span>
            <p className="text-sm font-mono text-gold">至少再跌 5% 才考虑第二批</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">原则：距离优先于时间。不是"每跌1%就加"，而是至少再跌5%才考虑。防手痒。</p>
      </div>

      {/* 操作记录 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">操作记录</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 text-xs rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
          >
            {showAddForm ? '取消' : '+ 记录操作'}
          </button>
        </div>

        {showAddForm && (
          <div className="p-3 rounded bg-muted/20 border border-border mb-3">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-muted-foreground">基金</label>
                <select
                  value={formData.fundCode}
                  onChange={(e) => setFormData({ ...formData, fundCode: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 text-xs bg-card-bg border border-border rounded text-foreground"
                >
                  <option value="">选择基金</option>
                  {allFunds.map((f) => (
                    <option key={f.code} value={f.code}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">操作</label>
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
                <label className="text-[11px] text-muted-foreground">金额</label>
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
                className="px-4 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">暂无操作记录，点击上方按钮添加</p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded bg-muted/10 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono">{r.date}</span>
                  <span className="font-medium">{r.fundCode}</span>
                  <span className={r.action === 'buy' || r.action === 'add' ? 'text-profit' : 'text-loss'}>
                    {r.action === 'buy' ? '买入' : r.action === 'sell' ? '卖出' : r.action === 'add' ? '加仓' : '减仓'}
                  </span>
                  <span className="font-mono">¥{r.amount.toLocaleString()}</span>
                </div>
                {r.notes && <span className="text-muted-foreground">{r.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
