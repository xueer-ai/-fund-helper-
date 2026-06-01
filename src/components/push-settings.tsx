'use client';

import { useState, useEffect } from 'react';
import { DISCLAIMER, IS_BACKTEST_MODE, PUSH_COOLDOWN_HOURS } from '@/lib/constants';

interface PushSettingsProps {
  onPushToggle?: (enabled: boolean) => void;
}

export function PushSettings({ onPushToggle }: PushSettingsProps) {
  const [sendKey, setSendKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [autoBuySignal, setAutoBuySignal] = useState(true);
  const [autoRiskAlert, setAutoRiskAlert] = useState(true);
  const [autoLearning, setAutoLearning] = useState(false);
  const [autoYanxuan, setAutoYanxuan] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ configured: boolean; message: string } | null>(null);

  // 加载保存的配置
  useEffect(() => {
    const stored = localStorage.getItem('serverchan_sendkey');
    if (stored) {
      setSavedKey(stored);
      setSendKey(stored);
      setPushEnabled(true);
    }
    const storedAuto = localStorage.getItem('serverchan_auto');
    if (storedAuto) {
      try {
        const auto = JSON.parse(storedAuto);
        setAutoBuySignal(auto.buySignal ?? true);
        setAutoRiskAlert(auto.riskAlert ?? true);
        setAutoLearning(auto.learning ?? false);
        setAutoYanxuan(auto.yanxuan ?? false);
      } catch { /* ignore */ }
    }
    // 检查服务端配置
    fetch('/api/push').then(r => r.json()).then(d => setConfigStatus(d)).catch(() => {});
  }, []);

  // 保存SendKey
  const handleSave = () => {
    if (sendKey.trim()) {
      localStorage.setItem('serverchan_sendkey', sendKey.trim());
      setSavedKey(sendKey.trim());
      setPushEnabled(true);
      setTestResult(null);
    }
  };

  // 删除SendKey
  const handleRemove = () => {
    localStorage.removeItem('serverchan_sendkey');
    setSendKey('');
    setSavedKey('');
    setPushEnabled(false);
    setTestResult(null);
  };

  // 测试推送
  const handleTest = async () => {
    if (!sendKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendKey: sendKey.trim(), type: 'test' }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.success
          ? '推送成功！请检查微信是否收到消息'
          : data.error || '推送失败',
      });
    } catch {
      setTestResult({ success: false, message: '网络错误，请重试' });
    } finally {
      setTesting(false);
    }
  };

  // 保存自动推送配置
  const saveAutoConfig = (key: string, value: boolean) => {
    const updates = {
      buySignal: key === 'buySignal' ? value : autoBuySignal,
      riskAlert: key === 'riskAlert' ? value : autoRiskAlert,
      learning: key === 'learning' ? value : autoLearning,
      yanxuan: key === 'yanxuan' ? value : autoYanxuan,
    };
    localStorage.setItem('serverchan_auto', JSON.stringify(updates));
    if (key === 'buySignal') setAutoBuySignal(value);
    if (key === 'riskAlert') setAutoRiskAlert(value);
    if (key === 'learning') setAutoLearning(value);
    if (key === 'yanxuan') setAutoYanxuan(value);
  };

  return (
    <div className="space-y-4">
      {/* 免责声明 */}
      <p className="text-[10px] text-muted-foreground leading-relaxed">{DISCLAIMER}</p>

      {/* 配置状态 */}
      {IS_BACKTEST_MODE && (
        <div className="rounded-md px-3 py-2 text-xs bg-amber/10 text-amber border border-amber/20">
          回测模式已开启 — 推送已暂停，参数调整不影响线上
        </div>
      )}
      <div className={`rounded-md px-3 py-2 text-xs ${
        pushEnabled && !IS_BACKTEST_MODE
          ? 'bg-profit/10 text-profit border border-profit/20'
          : IS_BACKTEST_MODE
          ? 'bg-amber/10 text-amber border border-amber/20'
          : 'bg-amber/10 text-amber border border-amber/20'
      }`}>
        {IS_BACKTEST_MODE
          ? '回测模式 — 推送暂停中'
          : pushEnabled
          ? '微信推送已启用'
          : '微信推送未配置 — 填入SendKey后可接收信号提醒'}
      </div>

      {/* SendKey输入 */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Server酱 SendKey</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={sendKey}
            onChange={(e) => setSendKey(e.target.value)}
            placeholder="SCT..."
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo/50"
          />
          <button
            onClick={handleSave}
            disabled={!sendKey.trim()}
            className="rounded-md bg-indigo px-3 py-2 text-xs text-white font-medium hover:bg-indigo/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            保存
          </button>
        </div>
        {savedKey && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">已保存: {savedKey.slice(0, 8)}...</span>
            <button
              onClick={handleRemove}
              className="text-[10px] text-loss hover:underline"
            >
              删除
            </button>
          </div>
        )}
      </div>

      {/* 测试推送 */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleTest}
          disabled={!sendKey.trim() || testing}
          className="rounded-md bg-profit/20 text-profit px-3 py-2 text-xs font-medium hover:bg-profit/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {testing ? '发送中...' : '发送测试消息'}
        </button>
        {testResult && (
          <span className={`text-[11px] ${testResult.success ? 'text-profit' : 'text-loss'}`}>
            {testResult.message}
          </span>
        )}
      </div>

      {/* 自动推送开关 */}
      <div className="space-y-2 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground font-medium">自动推送设置</p>

        <div className="space-y-2">
          <ToggleRow
            label="买点信号触发"
            description="黄金坑/钻石坑/企稳满仓触发时推送"
            checked={autoBuySignal}
            onChange={(v) => saveAutoConfig('buySignal', v)}
            disabled={!pushEnabled}
          />
          <ToggleRow
            label="风控预警"
            description="黄色/红色预警触发时推送"
            checked={autoRiskAlert}
            onChange={(v) => saveAutoConfig('riskAlert', v)}
            disabled={!pushEnabled}
          />
          <ToggleRow
            label="源哥言商学习"
            description="3时段学习内容定时推送"
            checked={autoLearning}
            onChange={(v) => saveAutoConfig('learning', v)}
            disabled={!pushEnabled}
          />
          <ToggleRow
            label="源哥严选播报"
            description="早间/尾盘严选核心解读推送"
            checked={autoYanxuan}
            onChange={(v) => saveAutoConfig('yanxuan', v)}
            disabled={!pushEnabled}
          />
        </div>
      </div>

      {/* 使用指南 */}
      <div className="pt-2 border-t border-border">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-[11px] text-indigo hover:underline"
        >
          {showGuide ? '收起使用指南 ▲' : '如何获取SendKey？ ▼'}
        </button>
        {showGuide && (
          <div className="mt-2 rounded-md bg-card border border-border px-3 py-3 space-y-2 text-[11px] text-muted-foreground">
            <p className="font-medium text-foreground">4步接入微信推送</p>
            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
              <li>微信搜索并关注公众号 <span className="text-foreground font-medium">「Server酱」</span></li>
              <li>浏览器访问 <span className="text-indigo font-mono">sct.ftqq.com</span> 用微信扫码登录</li>
              <li>在「Key & API」页面复制你的 <span className="text-foreground font-medium">SendKey</span></li>
              <li>粘贴到上方输入框 → 保存 → 发送测试消息</li>
            </ol>
            <p className="text-amber/80 pt-1">免费版每日限5条推送，建议优先开启买点信号+风控预警</p>
            <div className="pt-2 space-y-1 text-[10px]">
              <p className="font-medium text-foreground">推送防骚扰规则</p>
              <p>• 🔴 红色止损预警：不受冷却限制，随时推送</p>
              <p>• 🟡🟢 其他提醒：同一基金{PUSH_COOLDOWN_HOURS}小时内只推1次</p>
              <p>• 持有/观望状态不推送，只有状态变化才推</p>
            </div>
          </div>
        )}
      </div>

      {/* 服务端配置状态 */}
      {configStatus && configStatus.configured && (
        <div className="text-[10px] text-profit/70">
          服务端已预置SendKey，无需手动配置
        </div>
      )}
    </div>
  );
}

// 开关行组件
function ToggleRow({ label, description, checked, onChange, disabled }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-xs ${disabled ? 'text-muted-foreground/50' : 'text-foreground'}`}>{label}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked && !disabled ? 'bg-indigo' : 'bg-muted'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked && !disabled ? 'translate-x-4' : ''
        }`} />
      </button>
    </div>
  );
}
