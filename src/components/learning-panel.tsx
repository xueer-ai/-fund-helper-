'use client';

import { useState, useEffect, useCallback } from 'react';
import { CYCLE_THEORIES, IRON_RULES, HISTORY_CASES, DISCLAIMER } from '@/lib/constants';
import type { LearningPeriod, LearningContent, Quiz, LearningProgress } from '@/lib/types';

// 从API获取学习内容
async function fetchLearningContent(period: string): Promise<LearningContent | null> {
  try {
    const actionMap: Record<string, string> = {
      'morning': 'morning_learning',
      'noon': 'noon_review',
      'close': 'close_learning',
    };
    const action = actionMap[period];
    if (!action) return null;

    const res = await fetch(`/api/scheduler?action=${action}`);
    const data = await res.json();
    return {
      period: period as LearningPeriod,
      periodName: data.periodName || period,
      title: data.title || '',
      content: data.content || '',
      keyPoints: data.keyPoints || [],
      quizzes: data.quizzes || [],
      knowledgeLink: data.knowledgeLink || '',
    };
  } catch {
    return null;
  }
}

// 本地回退学习内容
function generateFallbackContent(period: LearningPeriod): LearningContent {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  if (period === 'morning') {
    const theory = CYCLE_THEORIES[dayIndex % 3];
    return {
      period: 'morning',
      periodName: '早间学习 09:20',
      title: `源哥三大周期理论：${theory.name}`,
      content: `${theory.description}\n\n对AI赛道影响：${theory.impactOnAI}\n\n当前阶段判断：${theory.currentPhase}`,
      keyPoints: [
        `${theory.name}核心定义与轮动规律`,
        `对AI赛道影响权重评估`,
        `当前周期阶段判断方法`,
      ],
      quizzes: [
        {
          id: 'm1',
          question: `当前${theory.name}处于哪个阶段？`,
          options: ['启动期', theory.currentPhase, '衰退期', '复苏期'],
          correctIndex: 1,
          explanation: `根据源哥周期理论，当前${theory.name}处于${theory.currentPhase}。`,
          source: '源哥言商·周期理论',
        },
        {
          id: 'm2',
          question: '159140黄金坑第一买点触发条件是？',
          options: ['净值≤1.37', '净值≤1.28', '净值≤1.42', '连3阳线'],
          correctIndex: 0,
          explanation: '第一档黄金坑：159140净值≤1.37（回调20%），分2-3天买入12%仓位。',
          source: '源哥言商·建仓方法论',
        },
        {
          id: 'm3',
          question: '三大周期叠加时，何时力度最强？',
          options: ['方向相反时', '方向一致时', '任一周期启动时', '三个周期都结束时'],
          correctIndex: 1,
          explanation: '三大周期方向叠加一致时，市场力度最强。',
          source: '源哥言商·周期理论',
        },
      ],
      knowledgeLink: '源哥三大周期理论',
    };
  }

  if (period === 'noon') {
    const rule = IRON_RULES[dayIndex % IRON_RULES.length];
    return {
      period: 'noon',
      periodName: '午间复习 12:00',
      title: `源哥投资铁律：${rule.title}`,
      content: rule.content,
      keyPoints: [
        rule.content,
        `出处：${rule.source}`,
        '结合当前持仓分析实战应用场景',
      ],
      quizzes: [
        {
          id: 'n1',
          question: `"${rule.title}"的核心要义是什么？`,
          options: [rule.content, '随意操作', '满仓梭哈', '追涨杀跌'],
          correctIndex: 0,
          explanation: rule.content,
          source: rule.source,
        },
        {
          id: 'n2',
          question: '3-3-4建仓法中，第三笔加仓比例是？',
          options: ['30%', '40%', '20%', '50%'],
          correctIndex: 1,
          explanation: '3-3-4法则：第一笔30%试探，第二笔30%确认，第三笔40%加仓。',
          source: '源哥言商·建仓方法论',
        },
      ],
      knowledgeLink: rule.title,
    };
  }

  // close
  const case_ = HISTORY_CASES[dayIndex % HISTORY_CASES.length];
  return {
    period: 'close',
    periodName: '收盘学习复盘 15:15',
    title: `历史行情对照：${case_.name}`,
    content: case_.description,
    keyPoints: [
      `回调幅度：${case_.callbackRange}`,
      `反弹规律：${case_.reboundRule}`,
      `与当前行情相似度：${case_.similarity}`,
    ],
    quizzes: [
      {
        id: 'c1',
        question: `${case_.name}的回调幅度是？`,
        options: [case_.callbackRange, '10%-15%', '50%-70%', '5%-10%'],
        correctIndex: 0,
        explanation: `${case_.name}回调${case_.callbackRange}，反弹规律：${case_.reboundRule}`,
        source: '源哥言商·历史复盘',
      },
      {
        id: 'c2',
        question: '当前行情与2023年AI行情的相似度评估是？',
        options: ['高', '中', '低', '完全不同'],
        correctIndex: 0,
        explanation: '同样是AI技术突破驱动的行情，当前相似度高。',
        source: '源哥言商·历史复盘',
      },
    ],
    knowledgeLink: '历史行情案例拆解',
  };
}

export function LearningPanel() {
  const [activePeriod, setActivePeriod] = useState<LearningPeriod>('morning');
  const [learningContent, setLearningContent] = useState<LearningContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<LearningProgress>({
    date: new Date().toISOString().split('T')[0],
    morningCompleted: false,
    noonCompleted: false,
    closeCompleted: false,
    totalQuizzesCorrect: 0,
    totalQuizzesTaken: 0,
    unlockedContent: [],
  });

  const loadContent = useCallback(async (period: LearningPeriod) => {
    setLoading(true);
    try {
      const content = await fetchLearningContent(period);
      setLearningContent(content || generateFallbackContent(period));
    } catch {
      setLearningContent(generateFallbackContent(period));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent(activePeriod);
  }, [activePeriod, loadContent]);

  const handleQuizAnswer = (quizId: string, optionIndex: number) => {
    if (quizSubmitted[quizId]) return;
    setQuizAnswers((prev) => ({ ...prev, [quizId]: optionIndex }));
  };

  const submitQuiz = (quizId: string) => {
    setQuizSubmitted((prev) => ({ ...prev, [quizId]: true }));
    setProgress((prev) => ({
      ...prev,
      totalQuizzesTaken: prev.totalQuizzesTaken + 1,
      totalQuizzesCorrect: prev.totalQuizzesCorrect + (
        learningContent?.quizzes?.find((q) => q.id === quizId)?.correctIndex === quizAnswers[quizId]
          ? 1 : 0
      ),
    }));
  };

  const markPeriodComplete = () => {
    setProgress((prev) => ({
      ...prev,
      [`${activePeriod}Completed`]: true,
    }));
  };

  const periodTabs: { key: LearningPeriod; label: string; time: string }[] = [
    { key: 'morning', label: '早间学习', time: '09:20' },
    { key: 'noon', label: '午间复习', time: '12:00' },
    { key: 'close', label: '收盘复盘', time: '15:15' },
  ];

  return (
    <div className="space-y-6">
      <p className="text-xs text-gold/90 font-medium">{DISCLAIMER}</p>

      {/* 学习时段切换 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground">源哥言商每日学习</h2>
          <div className="flex items-center gap-1">
            {progress.totalQuizzesTaken > 0 && (
              <span className="text-xs text-muted-foreground">
                答题正确率：{Math.round((progress.totalQuizzesCorrect / progress.totalQuizzesTaken) * 100)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {periodTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActivePeriod(tab.key); setQuizAnswers({}); setQuizSubmitted({}); }}
              className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                activePeriod === tab.key
                  ? 'bg-indigo/20 text-indigo border border-indigo/30'
                  : 'bg-muted/20 text-muted-foreground border border-transparent hover:bg-muted/30'
              }`}
            >
              <span>{tab.label}</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">{tab.time}</span>
              {progress[`${tab.key}Completed` as keyof LearningProgress] && (
                <span className="text-[11px] text-profit">✓ 已完成</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 学习内容 */}
      {loading ? (
        <div className="bg-card-bg rounded-lg p-6 border border-border text-center">
          <p className="text-xs text-muted-foreground">加载学习内容中...</p>
        </div>
      ) : learningContent ? (
        <div className="bg-card-bg rounded-lg p-4 border border-border">
          <h3 className="text-sm font-medium text-foreground mb-2">{learningContent.title}</h3>
          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line mb-3">
            {learningContent.content}
          </p>

          {/* 关键要点 */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">必掌握要点</p>
            <div className="space-y-1">
              {learningContent.keyPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/20">
                  <span className="text-[11px] text-indigo font-mono mt-0.5">{i + 1}</span>
                  <p className="text-xs text-foreground/80">{point}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 学习测验 */}
          {learningContent.quizzes && learningContent.quizzes.length > 0 && (
            <div className="border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">学习检验</p>
              <div className="space-y-4">
                {learningContent.quizzes.map((quiz) => (
                  <div key={quiz.id} className="p-3 rounded bg-muted/10 border border-border/50">
                    <p className="text-xs font-medium text-foreground mb-2">{quiz.question}</p>
                    <div className="space-y-1.5">
                      {quiz.options.map((opt, oi) => {
                        const isSelected = quizAnswers[quiz.id] === oi;
                        const isCorrect = quizSubmitted[quiz.id] && quiz.correctIndex === oi;
                        const isWrong = quizSubmitted[quiz.id] && isSelected && quiz.correctIndex !== oi;
                        return (
                          <button
                            key={oi}
                            onClick={() => handleQuizAnswer(quiz.id, oi)}
                            className={`w-full text-left px-3 py-1.5 rounded text-[11px] transition-colors border ${
                              isCorrect ? 'border-profit/50 bg-profit/10 text-profit' :
                              isWrong ? 'border-loss/50 bg-loss/10 text-loss' :
                              isSelected ? 'border-indigo/50 bg-indigo/10 text-indigo' :
                              'border-border/50 bg-muted/20 text-foreground/80 hover:bg-muted/30'
                            }`}
                          >
                            {String.fromCharCode(65 + oi)}. {opt}
                          </button>
                        );
                      })}
                    </div>
                    {!quizSubmitted[quiz.id] && quizAnswers[quiz.id] !== undefined && (
                      <button
                        onClick={() => submitQuiz(quiz.id)}
                        className="mt-2 px-3 py-1 text-xs rounded bg-indigo/20 text-indigo hover:bg-indigo/30"
                      >
                        提交答案
                      </button>
                    )}
                    {quizSubmitted[quiz.id] && (
                      <div className="mt-2 p-2 rounded bg-muted/20">
                        <p className={`text-xs ${
                          quiz.correctIndex === quizAnswers[quiz.id] ? 'text-profit' : 'text-loss'
                        }`}>
                          {quiz.correctIndex === quizAnswers[quiz.id] ? '✓ 正确！' : '✗ 错误'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{quiz.explanation}</p>
                        {quiz.source && (
                          <p className="text-xs text-indigo mt-1">出处：{quiz.source}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 关联知识点 */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">关联学习：</span>
            <span className="text-xs text-indigo ml-1">{learningContent.knowledgeLink}</span>
          </div>

          {/* 完成按钮 */}
          {!progress[`${activePeriod}Completed` as keyof LearningProgress] && (
            <button
              onClick={markPeriodComplete}
              className="mt-4 w-full py-2 text-xs font-medium rounded bg-profit/20 text-profit hover:bg-profit/30 transition-colors"
            >
              标记本时段学习完成
            </button>
          )}
        </div>
      ) : null}

      {/* 学习进度 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">今日学习进度</h3>
        <div className="grid grid-cols-3 gap-3">
          {periodTabs.map((tab) => {
            const completed = progress[`${tab.key}Completed` as keyof LearningProgress] as boolean;
            return (
              <div key={tab.key} className={`p-3 rounded border text-center ${
                completed ? 'border-profit/30 bg-profit/5' : 'border-border bg-muted/10'
              }`}>
                <span className={`text-lg ${completed ? 'text-profit' : 'text-muted-foreground/40'}`}>
                  {completed ? '✓' : '○'}
                </span>
                <p className="text-xs text-foreground mt-1">{tab.label}</p>
                <p className="text-[11px] text-muted-foreground">{tab.time}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">答题统计</span>
            <span className="text-xs font-mono text-foreground">
              {progress.totalQuizzesCorrect}/{progress.totalQuizzesTaken} 正确
            </span>
          </div>
        </div>
      </div>

      {/* 完整铁律清单 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">源哥投资铁律完整清单</h3>
        <div className="space-y-2">
          {IRON_RULES.map((rule, i) => (
            <div key={rule.id} className="p-2 rounded bg-muted/20 flex items-start gap-2">
              <span className="text-[11px] font-mono text-indigo mt-0.5">{i + 1}</span>
              <div>
                <p className="text-xs font-medium text-foreground">{rule.title}</p>
                <p className="text-xs text-muted-foreground">{rule.content}</p>
                <p className="text-[11px] text-indigo mt-0.5">出处：{rule.source}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
