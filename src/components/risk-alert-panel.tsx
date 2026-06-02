'use client';

import { useState } from 'react';

// 预警等级类型
type AlertLevel = 'all' | 'green' | 'yellow' | 'red';

interface Alert {
  id: string;
  level: 'green' | 'yellow' | 'red';
  title: string;
  fundName: string;
  content: string;
  action: string;
  learning: string;
}

// 模拟预警数据
const ALERTS: Alert[] = [
  {
    id: '1',
    level: 'green',
    title: '华夏芯片浮盈提醒',
    fundName: '华夏国证半导体芯片ETF联接A',
    content: '最新浮盈44.43%，距止盈线1.5613已超，根据40%-60%底仓逻辑可考虑分批减仓',
    action: '持仓不变，距止盈还有空间，保留底仓等待回调加仓窗口',
    learning: '分批止盈铁律',
  },
  {
    id: '2',
    level: 'green',
    title: '宝盈转型动力浮盈提醒',
    fundName: '宝盈转型动力灵活配置混合A',
    content: '最新浮盈16.65%，接近+10%止盈目标，关注趋势线',
    action: '持仓不变，关注收盘是否跌破20MA',
    learning: '趋势跟随策略',
  },
  {
    id: '3',
    level: 'green',
    title: '博时新能源平本附近',
    fundName: '博时新能源汽车主题混合A',
    content: '最新浮亏-0.45%，处于平本附近，暂无操作信号',
    action: '持仓观望，不加仓不减仓',
    learning: '底仓持有策略',
  },
  {
    id: '4',
    level: 'green',
    title: '买点信号待确认',
    fundName: '159140 科创AI / 022364 永赢科技',
    content: '当前净值均高于黄金坑阈值，买点尚未触发',
    action: '继续等待，不见兔子不撒鹰',
    learning: '不见兔子不撒鹰',
  },
  {
    id: '5',
    level: 'red',
    title: '平安半导体破止损线',
    fundName: '平安半导体领航精选混合C',
    content: '当前净值1.3400已跌破止损线¥1.3455，浮亏-10.37%，触发认错警戒',
    action: '1.核对收盘价是否有效跌破 2.若确认跌破→执行减仓/清仓计划 3.暂停一切补仓操作',
    learning: '价格止损铁律',
  },
];

// 风险标的
const RISK_TARGETS = [
  {
    name: '华夏国证半导体芯片ETF联接A',
    cost: '1.4194',
    nav: '2.0500',
    pnl: '+44.43%',
    pnlColor: 'text-[#10b981]',
    note: '右侧盈利，动态止盈保护中',
  },
  {
    name: '平安半导体领航精选混合C',
    cost: '1.4950',
    nav: '1.3400',
    pnl: '-10.37%',
    pnlColor: 'text-[#ef4444]',
    note: '已破止损线，认错警戒',
  },
  {
    name: '宝盈转型动力灵活配置混合A',
    cost: '3.5577',
    nav: '4.1500',
    pnl: '+16.65%',
    pnlColor: 'text-[#10b981]',
    note: '趋势跟随，关注20MA',
  },
  {
    name: '博时新能源汽车主题混合A',
    cost: '1.0949',
    nav: '1.0900',
    pnl: '-0.45%',
    pnlColor: 'text-[#ef4444]',
    note: '平本附近，补仓闸门关闭',
  },
];

export default function RiskAlertPanel() {
  const [filter, setFilter] = useState<AlertLevel>('all');
  const [lastScan, setLastScan] = useState(new Date().toLocaleTimeString('zh-CN'));

  const filteredAlerts = filter === 'all' ? ALERTS : ALERTS.filter((a) => a.level === filter);
  const greenCount = ALERTS.filter((a) => a.level === 'green').length;
  const yellowCount = ALERTS.filter((a) => a.level === 'yellow').length;
  const redCount = ALERTS.filter((a) => a.level === 'red').length;

  const handleRescan = () => {
    setLastScan(new Date().toLocaleTimeString('zh-CN'));
  };

  return (
    <div className="space-y-4">
      {/* 免责声明 */}
      <div className="bg-[#fff7ed] rounded-lg border border-[#fed7aa] px-4 py-2">
        <p className="text-xs text-[#9a3412]">
          重要提示: 内容仅为逻辑推演复盘, 不构成任何基金、理财投资建议, 市场有波动, 入市需谨慎
        </p>
      </div>

      {/* 分级预警机制 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e7eb] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1f2937]">分级预警机制</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRescan}
              className="text-xs text-[#3b82f6] font-medium hover:underline"
            >
              重新扫描
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#e5e7eb]">
          <div className="p-3 text-center bg-[#10b981]/5">
            <p className="text-xs font-medium text-[#10b981]">一级常规</p>
            <p className="text-2xl font-bold text-[#10b981]">{greenCount}</p>
          </div>
          <div className="p-3 text-center bg-[#f59e0b]/5">
            <p className="text-xs font-medium text-[#f59e0b]">二级黄色</p>
            <p className="text-2xl font-bold text-[#f59e0b]">{yellowCount}</p>
          </div>
          <div className="p-3 text-center bg-[#ef4444]/5">
            <p className="text-xs font-medium text-[#ef4444]">三级红色</p>
            <p className="text-2xl font-bold text-[#ef4444]">{redCount}</p>
          </div>
        </div>
        <div className="px-4 py-2 border-t border-[#e5e7eb] flex items-center justify-between">
          <p className="text-xs text-[#9ca3af]">上次扫描: {lastScan}</p>
          <div className="flex gap-1">
            {(['all', 'green', 'yellow', 'red'] as AlertLevel[]).map((lvl) => {
              const label = lvl === 'all' ? '全部' : lvl === 'green' ? `常规(${greenCount})` : lvl === 'yellow' ? `黄色(${yellowCount})` : `红色(${redCount})`;
              return (
                <button
                  key={lvl}
                  onClick={() => setFilter(lvl)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filter === lvl
                      ? 'bg-[#6366f1] text-white'
                      : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 预警详情列表 */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border overflow-hidden ${
              alert.level === 'red'
                ? 'border-[#fca5a5] bg-[#fef2f2]'
                : alert.level === 'yellow'
                ? 'border-[#fde68a] bg-[#fffbeb]'
                : 'border-[#e5e7eb] bg-white'
            }`}
          >
            {/* 标题栏 */}
            <div className={`px-4 py-2 flex items-center gap-2 ${
              alert.level === 'red' ? 'bg-[#ef4444] text-white' : 'border-b border-inherit'
            }`}>
              <span className={`text-xs font-bold ${
                alert.level === 'red' ? 'text-white' : alert.level === 'yellow' ? 'text-[#f59e0b]' : 'text-[#10b981]'
              }`}>
                {alert.level === 'red' ? '【三级红色】' : alert.level === 'yellow' ? '【二级黄色】' : '【常规】'}
              </span>
              <span className={`text-sm font-medium ${alert.level === 'red' ? 'text-white' : 'text-[#1f2937]'}`}>
                {alert.title}
              </span>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-[#4b5563]">{alert.content}</p>
              <div className="pt-2 border-t border-[#e5e7eb]/50">
                <p className="text-xs">
                  <span className="font-medium text-[#6b7280]">处置方案：</span>
                  <span className="text-[#4b5563]">{alert.action}</span>
                </p>
                <p className="text-xs mt-1">
                  <span className="font-medium text-[#6366f1]">关联学习：</span>
                  <span className="text-[#6366f1]">{alert.learning}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 风险标的速览 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">风险标的速览</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          {RISK_TARGETS.map((target, i) => (
            <div key={i} className="p-3 rounded-lg bg-[#f9fafb] border border-[#e5e7eb]">
              <p className="text-sm font-medium text-[#1f2937]">{target.name}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-[#9ca3af]">成本</p>
                  <p className="font-mono text-[#4b5563]">{target.cost}</p>
                </div>
                <div>
                  <p className="text-[#9ca3af]">当前</p>
                  <p className="font-mono text-[#4b5563]">{target.nav}</p>
                </div>
                <div>
                  <p className="text-[#9ca3af]">盈亏</p>
                  <p className={`font-mono font-medium ${target.pnlColor}`}>{target.pnl}</p>
                </div>
              </div>
              <p className="text-[10px] text-[#9ca3af] mt-2">{target.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
