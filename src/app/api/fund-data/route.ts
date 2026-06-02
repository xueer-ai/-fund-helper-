import { NextRequest, NextResponse } from 'next/server';

// 天天基金公开API - 获取基金实时估值
const FUND_API = 'https://fundgz.1234567.com.cn/js/';
// 天天基金历史净值API
const FUND_HISTORY_API = 'https://api.fund.eastmoney.com/f10/lsjz/';

// 基金代码映射（用户持仓基金没有标准代码的映射到实际基金代码）
const FUND_CODE_MAP: Record<string, string> = {
  '159140': '159140',  // 易方达科创创业AI
  '159142': '159142',  // 替代标的
  '022364': '022364',  // 永赢科技智选A
  '华夏芯片': '008887',  // 华夏国证半导体芯片ETF联接A
  '平安半导体': '016074', // 平安半导体领航精选混合C
  '宝盈转型': '000535',  // 宝盈转型动力灵活配置混合A
  '博时新能源': '017055', // 博时新能源汽车主题混合A
};

// 科创50指数代码
const INDEX_CODES: Record<string, string> = {
  '科创50': '1B0001', // 上证指数代理
};

interface FundRealtimeData {
  code: string;
  name: string;
  nav: number;           // 实时估值/最新净值
  lastNav: number;       // 昨日净值
  change: number;        // 涨跌幅%
  updateTime: string;    // 更新时间
  isTrading: boolean;    // 是否交易时段
  source: 'realtime' | 'fallback'; // 数据来源
}

// 检查当前是否为交易时段（工作日 9:30-15:00）
function isTradingHours(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeValue = hours * 100 + minutes;
  return timeValue >= 930 && timeValue <= 1500;
}

// 检查是否为工作日
function isWorkday(): boolean {
  const day = new Date().getDay();
  return day !== 0 && day !== 6;
}

// 从天天基金获取实时估值（JSONP格式）
async function fetchRealtimeEstimate(fundCode: string): Promise<FundRealtimeData | null> {
  try {
    const url = `${FUND_API}${fundCode}.js?rt=${Date.now()}`;
    const response = await fetch(url, {
      headers: { 'Referer': 'https://fund.eastmoney.com/' },
      signal: AbortSignal.timeout(5000),
    });
    const text = await response.text();
    // JSONP格式: jsonpgz({...})
    const match = text.match(/jsonpgz\((.+)\)/);
    if (!match) return null;

    const data = JSON.parse(match[1]);
    return {
      code: fundCode,
      name: data.name || fundCode,
      nav: parseFloat(data.gsz) || parseFloat(data.dwjz) || 0,
      lastNav: parseFloat(data.dwjz) || 0,
      change: parseFloat(data.gszzl) || 0,
      updateTime: data.gztime || data.jzrq || '',
      isTrading: true,
      source: 'realtime',
    };
  } catch {
    return null;
  }
}

// 获取基金最新净值（非实时）
async function fetchLatestNav(fundCode: string): Promise<FundRealtimeData | null> {
  try {
    const url = `${FUND_HISTORY_API}fundCode=${fundCode}&pageIndex=1&pageSize=1&startDate=&endDate=&callback=`;
    const response = await fetch(url, {
      headers: { 'Referer': 'https://fund.eastmoney.com/' },
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    const list = data?.Data?.LSJZList?.list;
    if (!list || list.length === 0) return null;

    const latest = list[0];
    return {
      code: fundCode,
      name: latest.name || fundCode,
      nav: parseFloat(latest.dwjz) || 0,
      lastNav: parseFloat(latest.ljjz) || 0,
      change: 0,
      updateTime: latest.fsrq || '',
      isTrading: false,
      source: 'realtime',
    };
  } catch {
    return null;
  }
}

// 获取科创50指数
async function fetchStar50Index(): Promise<FundRealtimeData | null> {
  try {
    // 使用东方财富指数行情API
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=1.000688&fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f57,f58,f60,f170&ut=fa5fd1943c7b386f172d6893dbfba10b`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    if (!data?.data) return null;

    const d = data.data;
    const closePrice = d.f43 / 100;  // 最新价（除以100）
    const prevClose = d.f60 / 100;   // 昨收
    const changePercent = d.f170 / 100; // 涨跌幅

    return {
      code: '科创50',
      name: '科创50指数',
      nav: closePrice,
      lastNav: prevClose,
      change: changePercent,
      updateTime: new Date().toLocaleString('zh-CN'),
      isTrading: isTradingHours(),
      source: 'realtime',
    };
  } catch {
    return null;
  }
}

// 检查当前是否需要开盘前校准（工作日 9:00-9:20）
function isPreMarketCalibration(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeValue = hours * 100 + minutes;
  return timeValue >= 900 && timeValue <= 920;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const all = searchParams.get('all');
  const calibrate = searchParams.get('calibrate'); // 强制实时校准

  const trading = isTradingHours();
  const workday = isWorkday();
  const preMarket = isPreMarketCalibration();
  // 校准模式或交易时段都获取实时数据
  const forceRealtime = calibrate === '1' || preMarket;

  // 单只基金查询
  if (code) {
    const actualCode = FUND_CODE_MAP[code] || code;

    if (code === '科创50') {
      const data = await fetchStar50Index();
      if (data) return NextResponse.json(data);
    }

    if (trading || forceRealtime) {
      const data = await fetchRealtimeEstimate(actualCode);
      if (data) return NextResponse.json({ ...data, calibrated: forceRealtime });
    }

    const data = await fetchLatestNav(actualCode);
    if (data) return NextResponse.json({ ...data, calibrated: false });

    // 回退：返回模拟数据标记
    return NextResponse.json({
      code,
      name: code,
      nav: 0,
      lastNav: 0,
      change: 0,
      updateTime: '',
      isTrading: false,
      source: 'fallback' as const,
      error: '无法获取数据',
    });
  }

  // 全量查询
  if (all === '1') {
    const codes = Object.keys(FUND_CODE_MAP);
    const results: FundRealtimeData[] = [];

    // 并行获取所有基金数据
    const promises = codes.map(async (key) => {
      const actualCode = FUND_CODE_MAP[key];
      let data: FundRealtimeData | null = null;

      if (trading || forceRealtime) {
        data = await fetchRealtimeEstimate(actualCode);
      }
      if (!data) {
        data = await fetchLatestNav(actualCode);
      }

      return data || {
        code: key,
        name: key,
        nav: 0,
        lastNav: 0,
        change: 0,
        updateTime: '',
        isTrading: false,
        source: 'fallback' as const,
      };
    });

    // 获取科创50
    const star50Promise = fetchStar50Index();

    const [fundResults, star50Result] = await Promise.all([
      Promise.all(promises),
      star50Promise,
    ]);

    results.push(...fundResults);
    if (star50Result) {
      results.push(star50Result);
    }

    // 统计数据质量
    const realtimeCount = results.filter(r => r.source === 'realtime').length;
    const fallbackCount = results.filter(r => r.source === 'fallback').length;

    return NextResponse.json({
      trading,
      workday,
      preMarket,
      calibrated: forceRealtime,
      updateTime: new Date().toISOString(),
      dataQuality: {
        realtime: realtimeCount,
        fallback: fallbackCount,
        total: results.length,
        isStale: fallbackCount > realtimeCount, // 回退数据多于实时数据=数据可能过时
      },
      funds: results,
    });
  }

  return NextResponse.json({ error: '请提供 code 或 all=1 参数' }, { status: 400 });
}
