'use client';

import { useState, useEffect } from 'react';
import { DISCLAIMER, IS_BACKTEST_MODE, PUSH_COOLDOWN_HOURS } from '@/lib/constants';

interface PushSettingsProps {
  onPushToggle?: (enabled: boolean) => void;
}

export function PushSettings({ onPushToggle }: PushSettingsProps) {
  const [pushplusToken, setPushplusToken] = useState('');
  const [serverchanKey, setServerchanKey] = useState('');
  const [status, setStatus] = useState<{ configured: boolean; primaryChannel: string; backtestMode: boolean } | null>(null);
  const [testing, setTesting] = useState<'pushplus' | 'serverchan' | null>(null);
  const [testResult, setTestResult] = useState<{ channel: string; success: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pushplus' | 'serverchan'>('pushplus');

  useEffect(() => {
    const saved = localStorage.getItem('push_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setPushplusToken(config.pushplusToken || '');
        setServerchanKey(config.serverchanKey || '');
      } catch { /* ignore */ }
    }
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/push');
      const data = await res.json();
      setStatus({ configured: data.configured, primaryChannel: data.primaryChannel, backtestMode: data.backtestMode });
    } catch { /* ignore */ }
  };

  const saveConfig = () => {
    setSaving(true);
    const config = { pushplusToken, serverchanKey, updatedAt: new Date().toISOString() };
    localStorage.setItem('push_config', JSON.stringify(config));
    onPushToggle?.(!!pushplusToken || !!serverchanKey);
    setTimeout(() => setSaving(false), 500);
  };

  const testPush = async (channel: 'pushplus' | 'serverchan') => {
    setTesting(channel);
    setTestResult(null);
    try {
      const body: Record<string, string> = { type: 'test' };
      if (channel === 'pushplus') body.pushplusToken = pushplusToken;
      else body.sendKey = serverchanKey;

      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setTestResult({ channel, success: data.success, error: data.error });
    } catch (err) {
      setTestResult({ channel, success: false, error: err instanceof Error ? err.message : '网络错误' });
    }
    setTesting(null);
  };

  return (
    <div className="space-y-3">
      {/* 回测模式提示 */}
      {IS_BACKTEST_MODE && (
        <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-2 text-[11px] text-amber-400">
          ⚠️ 回测模式已开启，所有推送已暂停
        </div>
      )}

      {/* 通道切换标签 */}
      <div className="flex gap-1">
        <button
          onClick={() => setActiveTab('pushplus')}
          className={`flex-1 px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
            activeTab === 'pushplus' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          PushPlus (200条/天)
        </button>
        <button
          onClick={() => setActiveTab('serverchan')}
          className={`flex-1 px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
            activeTab === 'serverchan' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Server酱 (5条/天)
        </button>
      </div>

      {/* PushPlus 配置 */}
      {activeTab === 'pushplus' && (
        <div className="space-y-2">
          <div className="text-[10px] text-emerald-400 font-medium">
            推荐 · 免费200条/天 · 支持一对多推送
          </div>
          <input
            type="password"
            value={pushplusToken}
            onChange={(e) => setPushplusToken(e.target.value)}
            placeholder="输入 PushPlus Token"
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <ol className="text-[10px] text-gray-500 space-y-0.5 ml-3 list-decimal">
            <li>微信搜索关注公众号「PushPlus推送加」</li>
            <li>浏览器访问 pushplus.plus 获取 Token</li>
            <li>填入 Token → 点测试 → 微信收到消息即成功</li>
          </ol>
          <div className="flex gap-2">
            <button
              onClick={() => testPush('pushplus')}
              disabled={!pushplusToken || testing === 'pushplus'}
              className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-[11px] rounded-md transition-colors"
            >
              {testing === 'pushplus' ? '发送中...' : '测试推送'}
            </button>
          </div>
        </div>
      )}

      {/* Server酱 配置 */}
      {activeTab === 'serverchan' && (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-400 font-medium">
            备用通道 · 免费5条/天
          </div>
          <input
            type="password"
            value={serverchanKey}
            onChange={(e) => setServerchanKey(e.target.value)}
            placeholder="输入 Server酱 SendKey"
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <ol className="text-[10px] text-gray-500 space-y-0.5 ml-3 list-decimal">
            <li>微信搜索关注公众号「Server酱」</li>
            <li>浏览器访问 sct.ftqq.com 获取 SendKey</li>
            <li>填入 SendKey → 点测试 → 微信收到消息即成功</li>
          </ol>
          <div className="flex gap-2">
            <button
              onClick={() => testPush('serverchan')}
              disabled={!serverchanKey || testing === 'serverchan'}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-[11px] rounded-md transition-colors"
            >
              {testing === 'serverchan' ? '发送中...' : '测试推送'}
            </button>
          </div>
        </div>
      )}

      {/* 测试结果 */}
      {testResult && (
        <div className={`p-2 rounded-md text-[10px] ${
          testResult.success ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'
        }`}>
          {testResult.success
            ? `✅ ${testResult.channel === 'pushplus' ? 'PushPlus' : 'Server酱'}推送成功！请检查微信`
            : `❌ 推送失败：${testResult.error}`
          }
        </div>
      )}

      {/* 保存按钮 */}
      <button
        onClick={saveConfig}
        className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] rounded-md transition-colors"
      >
        {saving ? '已保存' : '保存配置'}
      </button>

      {/* 推送规则说明 */}
      <div className="border-t border-gray-800 pt-2 space-y-1">
        <div className="text-[10px] text-gray-500 font-medium">推送规则</div>
        <div className="text-[10px] text-gray-600 space-y-0.5">
          <div>🔴 止损预警 — 不受冷却限制，随时推送</div>
          <div>🟡 止盈/风控 — 同基金{PUSH_COOLDOWN_HOURS}h内只推1次</div>
          <div>🟢 买点信号 — 同基金{PUSH_COOLDOWN_HOURS}h内只推1次</div>
          <div>📊 学习/严选 — {PUSH_COOLDOWN_HOURS}h内只推1次</div>
          <div>🔇 持有/观望 — 不推送，只有状态变化才推</div>
        </div>
      </div>

      {/* 当前状态 */}
      {status && (
        <div className="border-t border-gray-800 pt-2">
          <div className="text-[10px] text-gray-500">
            主通道：<span className={status.configured ? 'text-emerald-400' : 'text-red-400'}>
              {status.configured
                ? status.primaryChannel === 'pushplus' ? 'PushPlus ✅' : 'Server酱 ✅'
                : '未配置 ❌'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
