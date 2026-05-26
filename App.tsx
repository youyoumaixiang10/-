import React, { useMemo, useState } from 'react';

type Page = 'dashboard' | 'hotspots' | 'detail' | 'input' | 'result';
type Level = '高' | '中' | '低';
type Sentiment = '正向' | '中性' | '负向';

type Hotspot = {
  id: number;
  title: string;
  summary: string;
  heat: Level;
  sentiment: Sentiment;
  industryFit: Level;
  risk: Level;
  recommendation: '绿灯' | '黄灯' | '红灯';
  tags: string[];
  whyHot: string;
  audienceMood: string;
  industries: string;
  window: string;
  riskTips: string[];
  keywords: string[];
};

type ProductInput = { brand: string; product: string; highlights: string; audiences: string; restricted: string };

const hotspotTitles = '独库公路开通|高考毕业旅行|暑期亲子自驾|端午短途出行|某新能源品牌高速补能体验讨论|年轻人反向旅游|城市通勤高温季|家庭露营热|车主长途自驾返乡|竞品新车上市讨论'.split('|');

const hotspots: Hotspot[] = hotspotTitles.map((title, idx): Hotspot => ({
    id: idx + 1,
    title,
    summary: `${title}持续引发讨论，适合品牌借势内容承接与转化动作联动。`,
    heat: idx % 3 === 0 ? '高' : idx % 3 === 1 ? '中' : '低',
    sentiment: idx === 4 || idx === 9 ? '中性' : idx === 6 ? '负向' : '正向',
    industryFit: idx < 8 ? '高' : '中',
    risk: idx === 6 || idx === 9 ? '高' : idx === 4 ? '中' : '低',
    recommendation: idx === 6 || idx === 9 ? '红灯' : idx === 4 ? '黄灯' : '绿灯',
    tags: idx <= 3 ? ['自驾', '旅行', '远方'] : idx === 7 ? ['家庭', '露营'] : idx === 9 ? ['竞品', '科技'] : ['科技', '年轻人'],
    whyHot: '季节性出行+社媒UGC扩散，形成高密度内容爆发。',
    audienceMood: '关注真实体验、成本效率与安全保障。',
    industries: '汽车、文旅、户外、消费电子、保险服务。',
    window: '未来 5-10 天仍有热度尾巴，可快速上内容并联动门店。',
    riskTips: ['避免夸大承诺', '安全场景表述谨慎', '避免碰瓷官方与竞品攻击'],
    keywords: ['续航', '补能', '家庭出行', '智能科技', '省心省钱']
}));

function simulateMarketingAI(h: Hotspot, i: ProductInput) {
  const highlights = i.highlights.split('\n').filter(Boolean);
  const score = {
    relevance: h.industryFit === '高' ? 88 : h.industryFit === '中' ? 72 : 58,
    productFit: h.tags.some(t => ['自驾', '旅行', '远方'].includes(t)) ? 90 : h.tags.includes('科技') ? 84 : 70,
    safety: h.sentiment === '负向' || h.risk === '高' ? 45 : h.sentiment === '中性' ? 70 : 88,
    spread: h.heat === '高' ? 92 : h.heat === '中' ? 78 : 65,
  };
  const light = score.safety < 55 ? '红灯' : h.risk === '中' ? '黄灯' : '绿灯';
  const picked = highlights.filter(x => h.tags.some(t => x.includes('续航') && ['自驾', '旅行', '远方'].includes(t) || x.includes('VLA') && t.includes('科技') || x.includes('家庭') && t.includes('家庭'))).slice(0, 5);

  return {
    light,
    reason: light === '绿灯' ? '行业相关度高且情绪偏正向，适合快速借势。' : light === '黄灯' ? '具备流量，但存在舆情或表达风险，建议谨慎执行。' : '风险较高，建议以观察和轻量回应为主。',
    score,
    productRec: h.tags.includes('科技') ? 'G7' : h.tags.includes('家庭') ? 'G6+G7 双车组合' : 'G6',
    picked: picked.length ? picked : highlights.slice(0, 4),
  };
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('dashboard');
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [input, setInput] = useState<ProductInput>({
    brand: '小鹏汽车',
    product: 'G6 / G7',
    highlights: '1704km 综合续航\n430km 纯电续航\n800V + 5C\n12 分钟 10%-80% 补能\n第二代 VLA\n家庭远方出行\n超级增程',
    audiences: '年轻家庭\n长途自驾用户\n科技型用户\n亲子出行用户',
    restricted: '不夸大智驾\n不暗示完全自动驾驶\n不攻击竞品\n不碰重大负面事故\n不制造续航焦虑',
  });

  const result = useMemo(() => selected ? simulateMarketingAI(selected, input) : null, [selected, input]);

  const nav = (
    <aside className="w-64 p-4 bg-slate-900 text-white min-h-screen">
      <h1 className="text-xl font-bold mb-6">机会营销 AI 雷达</h1>
      {['dashboard', 'hotspots', 'input'].map((p) => <button key={p} className="block w-full text-left py-2 px-3 rounded hover:bg-slate-700" onClick={() => setPage(p as Page)}>{p === 'dashboard' ? '首页 Dashboard' : p === 'hotspots' ? '最近一周热点' : '品牌产品输入'}</button>)}
    </aside>
  );

  return <div className="flex"><div>{nav}</div><main className="flex-1 p-6">{page === 'dashboard' && <section><h2 className="text-3xl font-bold">机会营销 AI 雷达</h2><p className="mt-2 text-slate-600">从热点发现到产品借势建议，让 PMM 从人工刷热点、凭经验判断、手写 brief，升级为 AI 自动识别机会、匹配产品卖点、生成作战卡。</p><div className="grid grid-cols-4 gap-4 mt-6">{[['本周扫描热点', '20'], ['推荐借势热点', '6'], ['高风险热点', '3'], ['预计节省时间', '12h']].map(([k,v]) => <div key={k} className="bg-white rounded-xl shadow p-4"><div className="text-slate-500 text-sm">{k}</div><div className="text-3xl font-bold text-indigo-600">{v}</div></div>)}</div><div className="mt-6 space-x-3"><button onClick={()=>setPage('hotspots')} className="px-4 py-2 rounded bg-indigo-600 text-white">查看最近一周热点</button><button className="px-4 py-2 rounded border">手动输入热点</button><button className="px-4 py-2 rounded border">管理产品卖点库</button></div><div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white">热点发现 → 热点解读 → 品牌匹配 → 产品卖点匹配 → 借势建议生成 → 作战卡输出</div></section>}

  {page === 'hotspots' && <section><h2 className="text-2xl font-bold mb-4">最近一周热点</h2><div className="grid gap-4">{hotspots.map(h=><div key={h.id} className="bg-white p-4 rounded-xl shadow"><div className="font-semibold">{h.title}</div><div className="text-sm text-slate-600 mt-1">{h.summary}</div><div className="mt-2 text-xs">热度:{h.heat} | 情绪:{h.sentiment} | 行业相关度:{h.industryFit} | 风险:{h.risk} | 推荐:{h.recommendation}</div><div className="flex flex-wrap gap-2 mt-2">{h.tags.map(t=><span key={t} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">{t}</span>)}</div><div className="mt-3 space-x-2"><button className="px-3 py-1 bg-slate-900 text-white rounded" onClick={()=>{setSelected(h);setPage('detail');}}>查看详情</button><button className="px-3 py-1 border rounded" onClick={()=>{setSelected(h);setPage('input');}}>生成借势建议</button></div></div>)}</div></section>}

  {page === 'detail' && selected && <section><h2 className="text-2xl font-bold">{selected.title}</h2><ul className="mt-4 space-y-2 text-slate-700"><li>热点概述：{selected.summary}</li><li>为什么火：{selected.whyHot}</li><li>用户情绪：{selected.audienceMood}</li><li>适合行业：{selected.industries}</li><li>窗口期：{selected.window}</li><li>风险提示：{selected.riskTips.join('；')}</li><li>营销关键词：{selected.keywords.join('、')}</li></ul><button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded" onClick={()=>setPage('input')}>输入品牌和产品，生成借势建议</button></section>}

  {page === 'input' && <section><h2 className="text-2xl font-bold">品牌与产品输入</h2>{!selected && <p className='text-amber-600 mt-2'>提示：请先在热点页选择一个热点，当前将使用默认逻辑。</p>}<div className="grid grid-cols-2 gap-4 mt-4">{[['brand','品牌'],['product','产品']].map(([k,l])=><label key={k} className="block"><span>{l}</span><input className="w-full border rounded p-2 mt-1" value={(input as any)[k]} onChange={e=>setInput({...input,[k]:e.target.value})}/></label>)}</div>{[['highlights','核心卖点'],['audiences','目标人群'],['restricted','禁区词']].map(([k,l])=><label key={k} className="block mt-3"><span>{l}</span><textarea className="w-full border rounded p-2 mt-1 h-28" value={(input as any)[k]} onChange={e=>setInput({...input,[k]:e.target.value})}/></label>)}<button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded" onClick={()=>setPage('result')}>生成机会营销作战卡</button></section>}

  {page === 'result' && selected && result && <section><h2 className="text-2xl font-bold">机会营销作战卡</h2><div className="mt-3 p-4 bg-white rounded-xl shadow space-y-3"><div><b>1. 借势判断：</b><span className="ml-2 px-2 py-1 rounded bg-indigo-100">{result.light}</span> {result.reason}</div><div><b>2. 匹配度</b><div className="grid grid-cols-2 gap-2 mt-2">{Object.entries(result.score).map(([k,v])=><div key={k}><div className="text-sm">{k}: {v}%</div><div className="w-full bg-slate-200 h-2 rounded"><div className="h-2 rounded bg-indigo-600" style={{width:`${v}%`}}/></div></div>)}</div></div><div><b>3. 推荐承接产品：</b>{result.productRec}</div><div><b>4. 可承接卖点：</b>{result.picked.join('；')}</div><div><b>5. 创意方向：</b>官方内容方向 / KOL-KOC 内容方向 / 车主共创方向</div><div><b>6. 推荐话题：</b>#开小鹏G6去独库 #G6G7把远方变成日常 #一台车跑完新疆万公里 #暑期自驾不焦虑 #补能快更敢跑远 #家庭出行安心局</div><div><b>7. 推荐执行动作：</b>官方账号发布场景短视频；达人实测续航补能；车主征集远方故事；门店做周末主题试驾。</div><div><b>8. 风险提示：</b>避免夸大智能驾驶能力；避免碰瓷文旅官方；避免攻击竞品；安全场景谨慎表述。</div><div><b>9. ROI 估算：</b>传统人工 4-6h；AI 初稿 3min；人工优化 30min；单次节省约 3.5-5h；可复制到产品营销/品牌传播/区域营销/社媒运营/销售赋能。</div><button className="px-4 py-2 border rounded" onClick={()=>navigator.clipboard.writeText(JSON.stringify({selected,input,result},null,2))}>10. 一键复制</button></div></section>}

  {page === 'result' && !selected && <section><p>请先从热点列表选择热点。</p><button className='mt-3 px-4 py-2 bg-indigo-600 text-white rounded' onClick={()=>setPage('hotspots')}>去选择热点</button></section>}
  </main></div>;
};

export default App;
