'use client';

import { useState, useEffect } from 'react';

// 三大周期数据
const CYCLES = [
  {
    name: 'AI科技主线周期',
    desc: 'AI赛道从萌芽→主升→回调→再主升的轮动规律，当前处于主升浪回调期',
    stage: '主升浪回调期',
  },
  {
    name: '美联储加息周期',
    desc: '加息→缩表→降息的完整周期，影响全球科技股估值中枢',
    stage: '加息尾声/降息预期期',
  },
  {
    name: '大宗商品油价周期',
    desc: '油价波动影响通胀预期与货币政策节奏，油价破90触发三级预警',
    stage: '中位震荡期',
  },
];

// 投资铁律完整清单
const IRON_RULES = [
  { title: '不见兔子不撒鹰', desc: '右侧没有出现信号不执行，没有到阈值绝不手动', source: '源哥言商投资铁律' },
  { title: '分批建仓3-3-4法则', desc: '第一批30%试错，第二批30%确认，第三批40%加仓，杜绝一次性满仓', source: '源哥言商建仓方法论' },
  { title: '追高是亏损根源', desc: '严守净值红线，159140>1.37、022364>5.68劝阻一切新开仓', source: '源哥言商风控控制' },
  { title: '时间止损比价格止损更重要', desc: '2026年11月节点：未创新高则AI仓位压至20%以下', source: '源哥言商周期理论' },
  { title: '卖的5大层次', desc: '从情绪→卖故事→卖产品→卖标准→卖规则，理解商业底层逻辑', source: '源哥言商商业思维' },
  { title: '人生九段论与财富积累', desc: '理解不同段位对应的财富积累方式，投资是七段以上的财富路径', source: '源哥言商人生智慧' },
  { title: '现金是资产守恒底线', desc: '流动性资产的核心价值，要留备用金半年不动就是守恒', source: '源哥言商财富管理' },
];

// 学习测验题
const QUIZ_QUESTIONS = [
  {
    question: '美联储加息周期当前处于哪个阶段？',
    options: ['A. 加息尾声/降息预期期', 'B. 主升浪回调期', 'C. 底部震荡期', 'D. 上升通道期'],
    correct: 0,
  },
  {
    question: '159140黄金坑第一买点触发条件是？',
    options: ['A. 净值<1.37（回撤20%）', 'B. 净值<1.28（回撤25%）', 'C. 净值<1.42'],
    correct: 0,
  },
  {
    question: '三大周期中，哪个直接影响AI赛道估值中枢？',
    options: ['A. 美联储加息周期', 'B. 大宗商品油价周期', 'C. AI科技主线周期', 'D. 以上都是'],
    correct: 3,
  },
];

export default function LearningPanel() {
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([-1, -1, -1]);
  const [submitted, setSubmitted] = useState<boolean[]>([false, false, false]);
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [progress, setProgress] = useState({ morning: '', noon: '', close: '' });

  useEffect(() => {
    // 模拟学习进度
    setProgress({
      morning: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      noon: '00:00',
      close: '00:00',
    });
  }, []);

  const handleSelect = (qIndex: number, optIndex: number) => {
    if (submitted[qIndex]) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[qIndex] = optIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmit = (qIndex: number) => {
    if (selectedAnswers[qIndex] === -1) return;
    const newSubmitted = [...submitted];
    newSubmitted[qIndex] = true;
    setSubmitted(newSubmitted);
  };

  return (
    <div className="space-y-4">
      {/* 免责声明 */}
      <div className="bg-[#6366f1]/5 rounded-lg border border-[#6366f1]/20 px-4 py-2">
        <p className="text-xs text-[#4338ca]">
          重要提示: 内容仅为逻辑推演复盘, 不构成任何基金、理财投资建议, 市场有波动, 入市需谨慎
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 左侧：周期理论学习 + 学习检验 */}
        <div className="space-y-4">
          {/* 源哥周期理论学习 */}
          <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
              <h3 className="text-sm font-bold text-[#1f2937]">
                源哥周期理论学习：美联储加息周期
              </h3>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-[#6b7280]">
                加息→缩表→降息的完整周期，影响全球科技股估值中枢
              </p>
              <div className="space-y-1.5">
                <p className="text-xs text-[#1f2937]">
                  <span className="font-medium text-[#6366f1]">当前阶段：</span>加息尾声/降息预期期
                </p>
                <p className="text-xs text-[#1f2937]">
                  <span className="font-medium text-[#6366f1]">对AI赛道影响：</span>加息压制估值，降息利好成长，CME预期是前瞻指标
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-[#f3f4f6]">
                <p className="text-xs font-medium text-[#374151] mb-1.5">必掌握要点：</p>
                <ol className="space-y-1 text-xs text-[#6b7280] list-decimal list-inside">
                  <li>美联储加息周期核心定义与轮动规律</li>
                  <li>当前周期阶段判断方法</li>
                  <li>对159140/022364净值走势的影响权重</li>
                </ol>
              </div>
              <button
                onClick={() => setReadConfirmed(true)}
                className={`mt-2 px-3 py-1.5 rounded text-xs font-medium ${
                  readConfirmed
                    ? 'bg-[#6366f1] text-white'
                    : 'bg-[#6366f1]/10 text-[#6366f1] hover:bg-[#6366f1]/20'
                }`}
              >
                我已阅读
              </button>
            </div>
          </div>

          {/* 学习检验 */}
          <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
              <h3 className="text-sm font-bold text-[#1f2937]">学习检验</h3>
            </div>
            <div className="p-4 space-y-4">
              {QUIZ_QUESTIONS.map((q, qIndex) => (
                <div key={qIndex}>
                  <p className="text-xs font-medium text-[#1f2937] mb-2">{q.question}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, optIndex) => {
                      const isSelected = selectedAnswers[qIndex] === optIndex;
                      const isCorrect = submitted[qIndex] && optIndex === q.correct;
                      const isWrong = submitted[qIndex] && isSelected && optIndex !== q.correct;

                      return (
                        <button
                          key={optIndex}
                          onClick={() => handleSelect(qIndex, optIndex)}
                          className={`w-full text-left px-3 py-2 rounded text-xs border transition-colors ${
                            isCorrect
                              ? 'bg-[#10b981]/10 border-[#10b981] text-[#10b981]'
                              : isWrong
                              ? 'bg-[#ef4444]/10 border-[#ef4444] text-[#ef4444]'
                              : isSelected
                              ? 'bg-[#6366f1]/10 border-[#6366f1] text-[#6366f1]'
                              : 'bg-white border-[#e5e7eb] text-[#4b5563] hover:border-[#6366f1]/50'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handleSubmit(qIndex)}
                    disabled={selectedAnswers[qIndex] === -1}
                    className="mt-2 px-3 py-1.5 rounded text-xs font-medium bg-[#6366f1] text-white disabled:opacity-40"
                  >
                    提交答案
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：三大周期 + 铁律清单 */}
        <div className="space-y-4">
          {/* 源哥三大周期 */}
          <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
              <h3 className="text-sm font-bold text-[#1f2937]">源哥三大周期</h3>
            </div>
            <div className="p-4 space-y-3">
              {CYCLES.map((cycle, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#f9fafb] border border-[#e5e7eb]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#1f2937]">{cycle.name}</p>
                    <span className="px-2 py-0.5 rounded text-xs bg-[#6366f1]/10 text-[#6366f1] font-medium">
                      {cycle.stage}
                    </span>
                  </div>
                  <p className="text-xs text-[#6b7280] mt-1">{cycle.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 源哥投资铁律完整清单 */}
          <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
              <h3 className="text-sm font-bold text-[#1f2937]">源哥投资铁律完整清单</h3>
            </div>
            <div className="p-4 space-y-3">
              {IRON_RULES.map((rule, i) => (
                <div key={i} className="py-2 border-b border-[#f3f4f6] last:border-b-0">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded bg-[#6366f1]/10 text-[#6366f1] text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#1f2937]">{rule.title}</p>
                      <p className="text-xs text-[#6b7280] mt-0.5">{rule.desc}</p>
                      <p className="text-[10px] text-[#9ca3af] mt-0.5">出处：{rule.source}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 今日学习进度 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">今日学习进度</h3>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#e5e7eb]">
          <div className="p-3 text-center">
            <p className="text-xs text-[#6b7280]">晨读学习</p>
            <p className="text-sm font-mono text-[#1f2937] mt-1">{progress.morning || '00:00'}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-xs text-[#6b7280]">午间复习</p>
            <p className="text-sm font-mono text-[#9ca3af] mt-1">{progress.noon || '00:00'}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-xs text-[#6b7280]">收盘复盘</p>
            <p className="text-sm font-mono text-[#9ca3af] mt-1">{progress.close || '00:00'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
