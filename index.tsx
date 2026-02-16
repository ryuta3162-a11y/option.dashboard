import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  X, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronDown,
  BarChart3,
  Table as TableIcon,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Loader2,
  Layers,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell
} from 'recharts';

/**
 * 運用環境設定 (Vercel / Git 管理用)
 */
const CONFIG = {
  BRAND_RED: '#C21642',
  BRAND_DARK: '#111827',
  BG_GRAY: '#F3F4F6',
  SPREADSHEET_ID: '1Ltb7TUD8WQFYKAxxFjOqT0uwp1396sD7SfeM8PkfPag',
  API_URL: '/api/get-sheet-data', // Vercel API Routes 想定
};

// --- 型定義 (Types) ---
interface OptionData {
  id: string;
  name: string;
  isContracted: boolean; 
  billingCount: number;  
  sales: number;         
  salesExTax: number;    
  ratio: number;         
}

interface StoreData {
  id: string;
  name: string;          
  type: string;          
  totalPerformance: number; 
  options: OptionData[];
  summary: {
    totalSales: number;  
    currentRatio: number; 
    prevRatio: number;    
    prevDiff: number;     
  };
}

// カラム構成定義 (D列から5列周期)
const OPTIONS_LIST = [
  { id: 'support', name: '安心サポート' },
  { id: 'hydrogen', name: '水素水' },
  { id: 'locker', name: 'ロッカー関連' },
  { id: 'tanning', name: 'タンニング' },
  { id: 'body_comp', name: '体組成計' },
  { id: 'protein', name: 'プロテイン' },
  { id: 'supplement', name: 'サプリメント' },
  { id: 'online', name: 'オンラインレッスン' },
  { id: 'ladies', name: 'レディースエリア' },
  { id: 'studio', name: 'スタジオ関連' },
  { id: 'collagen', name: 'コラーゲン' },
  { id: 'oxygen', name: '酸素ボックス' },
  { id: 'rental', name: 'レンタルタワー' },
  { id: 'esthe', name: 'セルフエステ' },
  { id: 'depilation', name: 'セルフ脱毛' },
];

// --- ユーティリティ ---
const formatCurrency = (val: number) => `¥${Math.floor(val).toLocaleString()}`;

const App = () => {
  const [data, setData] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStores, setSelectedStores] = useState<StoreData[]>([]);
  const [activeMetric, setActiveMetric] = useState<'salesExTax' | 'billingCount'>('salesExTax');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('2025年度12月');
  
  const searchRef = useRef<HTMLDivElement>(null);

  /**
   * スプレッドシートからのデータ取得
   */
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 実際は API を叩く: const res = await fetch(CONFIG.API_URL);
      await new Promise(r => setTimeout(r, 1500)); 

      // シミュレーションデータ
      const mockStores = [
        '仙台泉', '仙台新寺', '仙台荒井', '川口仲町', '西川口', '武蔵浦和', 
        '南浦和', '北浦和', '南与野', '目黒', '南青山', '乃木坂', '赤坂'
      ].map((name, i) => {
        const type = i % 3 === 0 ? '赤' : i % 3 === 1 ? 'GH' : 'ジムLITE';
        const options = OPTIONS_LIST.map(opt => {
          const isContracted = Math.random() > 0.1;
          const billingCount = isContracted ? Math.floor(Math.random() * 250) + 40 : 0;
          const salesExTax = billingCount * 1350;
          return {
            ...opt,
            isContracted,
            billingCount,
            sales: salesExTax * 1.1,
            salesExTax,
            ratio: Math.random() * 5
          };
        });

        return {
          id: `st-${i}`,
          name,
          type,
          totalPerformance: Math.random() * 8000000 + 2000000,
          options,
          summary: {
            totalSales: options.reduce((acc, o) => acc + o.salesExTax, 0),
            currentRatio: Math.random() * 12,
            prevRatio: Math.random() * 12,
            prevDiff: (Math.random() - 0.3) * 350000
          }
        };
      });

      setData(mockStores);
    } catch (err) {
      setError('データベース接続エラー：スプレッドシートの権限またはURLを確認してください。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedMonth]);

  const filteredData = useMemo(() => selectedStores.length > 0 ? selectedStores : data, [selectedStores, data]);

  const kpi = useMemo(() => {
    const total = filteredData.reduce((acc, s) => acc + s.summary.totalSales, 0);
    const diff = filteredData.reduce((acc, s) => acc + s.summary.prevDiff, 0);
    const billing = filteredData.reduce((acc, s) => acc + s.options.reduce((sum, o) => sum + o.billingCount, 0), 0);
    return { total, diff, avgBilling: Math.floor(billing / (filteredData.length || 1)) };
  }, [filteredData]);

  const chartData = useMemo(() => {
    const isCompare = selectedStores.length >= 2;
    if (isCompare) {
      return OPTIONS_LIST.map(opt => {
        const entry: any = { name: opt.name };
        selectedStores.forEach(s => {
          const target = s.options.find(o => o.id === opt.id);
          entry[s.name] = target ? target[activeMetric] : 0;
        });
        return entry;
      });
    }
    return OPTIONS_LIST.map(opt => {
      const sum = filteredData.reduce((acc, s) => {
        const t = s.options.find(o => o.id === opt.id);
        return acc + (t ? t[activeMetric] : 0);
      }, 0);
      return { name: opt.name, value: sum };
    }).sort((a, b) => b.value - a.value);
  }, [filteredData, selectedStores, activeMetric]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    return data.filter(s => !selectedStores.find(sel => sel.id === s.id) && s.name.includes(searchQuery));
  }, [searchQuery, data, selectedStores]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsSearchOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
        <div className="bg-white p-12 border-t-8 border-[#C21642] shadow-2xl text-center max-w-lg rounded-sm">
          <AlertCircle size={54} className="text-[#C21642] mx-auto mb-6" />
          <h2 className="text-xl font-black mb-2 uppercase tracking-tighter">Database Connection Error</h2>
          <p className="text-gray-400 text-sm mb-8 font-bold">{error}</p>
          <button onClick={loadData} className="bg-[#C21642] text-white px-8 py-3 font-black flex items-center gap-3 mx-auto shadow-lg hover:opacity-90">
            <RefreshCw size={18} /> RECONNECT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111827] font-sans pb-20">
      {/* 統合ヘッダー */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm px-8">
        <div className="flex h-16 items-center justify-between gap-12">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-[#C21642] shadow-[0_0_8px_#C21642]"></div>
              <h1 className="text-xl font-black tracking-tighter uppercase">Option Dashboard</h1>
            </div>
            <div className="h-6 w-[1px] bg-gray-200"></div>
            <div className="relative">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 text-xs font-black py-2 pl-4 pr-10 rounded-sm focus:outline-none cursor-pointer hover:bg-white transition-all uppercase"
              >
                <option value="2025年度12月">2025年度 12月</option>
                <option value="2025年度11月">2025年度 11月</option>
                <option value="2025年度10月">2025年度 10月</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* 右上：店舗・業態検索 */}
          <div className="flex-1 max-w-xl relative" ref={searchRef}>
            <div className={`relative flex items-center bg-gray-50 border rounded px-4 py-2 transition-all ${isSearchOpen ? 'border-[#C21642] bg-white ring-4 ring-[#C21642]/5' : 'border-gray-200'}`}>
              <Search className="text-gray-400 w-4 h-4 mr-3" />
              <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[50%]">
                {selectedStores.map(s => (
                  <span key={s.id} className="bg-[#C21642] text-white text-[10px] font-black px-2 py-0.5 rounded-sm flex items-center gap-1 whitespace-nowrap animate-in zoom-in-95">
                    {s.name}
                    <button onClick={() => setSelectedStores(selectedStores.filter(x => x.id !== s.id))}><X size={10} /></button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="店舗名・業態を検索し比較対象に追加..."
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-300 font-bold"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {isSearchOpen && searchQuery && (
              <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 shadow-2xl rounded-sm overflow-hidden z-50">
                <div className="p-2 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">RESULTS</div>
                <ul className="max-h-72 overflow-y-auto">
                  {searchResults.map(s => (
                    <li key={s.id} onClick={() => { if(selectedStores.length < 5) setSelectedStores([...selectedStores, s]); setSearchQuery(''); }} className="px-5 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-none flex justify-between items-center text-sm transition-colors">
                      <span className="font-black text-gray-800">{s.name}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-sm ${s.type === '赤' ? 'bg-[#C21642] text-white' : 'bg-gray-100 text-gray-500'}`}>{s.type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* メイングリッド */}
      <main className="container mx-auto px-8 py-12 max-w-7xl">
        {loading ? (
          <div className="h-[65vh] flex flex-col items-center justify-center text-gray-300 gap-6">
            <div className="relative">
              <Loader2 className="animate-spin text-[#C21642]" size={54} />
              <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#C21642]/30" size={24} />
            </div>
            <p className="font-black text-xs tracking-[0.5em] uppercase animate-pulse">Synchronizing Data Matrix...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* 分析タイトル */}
            <div className="flex justify-between items-end mb-12 border-b-4 border-gray-900 pb-8">
              <div>
                <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none text-gray-900">
                  {selectedStores.length === 0 ? 'Global Overview' : selectedStores.length === 1 ? `${selectedStores[0].name} Profile` : 'Comparative Analysis'}
                </h2>
                <div className="flex items-center gap-3 mt-4">
                  <span className="text-[11px] font-black text-[#C21642] tracking-[0.4em] uppercase">
                    {selectedMonth} / PL管理実績評価基準
                  </span>
                  <div className="h-1 w-12 bg-gray-300"></div>
                </div>
              </div>
              <div className="flex gap-2">
                {[1,2,3].map(i => <div key={i} className={`w-14 h-2.5 ${i===1 ? 'bg-[#C21642] shadow-[0_0_10px_#C21642]' : i===2 ? 'bg-gray-800' : 'bg-gray-200'}`} />)}
              </div>
            </div>

            {/* KPIセクション */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white p-8 shadow-xl border-t-4 border-[#C21642] flex flex-col justify-between hover:translate-y-[-4px] transition-all cursor-default group">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex justify-between">
                    オプション実績総額 (税別)
                    <span className="group-hover:text-[#C21642] transition-colors tracking-normal">PL-BASED</span>
                  </p>
                  <h3 className="text-4xl font-black tracking-tighter text-gray-900">{formatCurrency(kpi.total)}</h3>
                </div>
                <div className={`mt-6 text-xs font-black flex items-center ${kpi.diff >= 0 ? 'text-[#C21642]' : 'text-gray-400'}`}>
                  {kpi.diff >= 0 ? <TrendingUp size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
                  {formatCurrency(Math.abs(kpi.diff))} <span className="text-[10px] ml-2 opacity-40 font-bold uppercase tracking-widest">Diff vs Prev</span>
                </div>
              </div>
              
              <div className="bg-white p-8 shadow-xl border-t-4 border-gray-900 flex flex-col justify-between hover:translate-y-[-4px] transition-all">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">平均請求件数 (UNIT)</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black tracking-tighter text-gray-900">{kpi.avgBilling.toLocaleString()}</h3>
                    <span className="text-sm font-black text-gray-400">件/店</span>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-900 w-[102.4%]"></div>
                  </div>
                  <span className="text-[10px] font-black text-gray-600">102.4%</span>
                </div>
              </div>

              <div className="bg-white p-8 shadow-xl border-t-4 border-gray-300 flex flex-col justify-between hover:translate-y-[-4px] transition-all">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">接続店舗数</p>
                  <h3 className="text-4xl font-black tracking-tighter text-gray-900">{filteredData.length}</h3>
                </div>
                <p className="mt-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  {selectedStores.length ? 'Filtering applied' : 'Global Connected'}
                </p>
              </div>
            </div>

            {/* 分析マトリクス (グラフ) */}
            <div className="bg-white p-12 shadow-2xl border border-gray-200 mb-12 rounded-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none transition-transform duration-1000 group-hover:scale-110">
                <Layers size={250} />
              </div>
              
              <div className="flex justify-between items-center mb-16 border-b-2 border-gray-50 pb-10">
                <div className="flex items-center gap-5">
                  <div className="bg-[#C21642] p-3 text-white shadow-2xl shadow-[#C21642]/20 rounded-sm italic font-black">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.3em]">パフォーマンス分析マトリクス</h3>
                    <p className="text-[10px] font-bold text-gray-300 uppercase mt-1.5 tracking-widest italic">Numerical performance distribution analysis</p>
                  </div>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-sm shadow-inner border border-gray-200">
                  <button onClick={() => setActiveMetric('salesExTax')} className={`px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeMetric === 'salesExTax' ? 'bg-white shadow-xl text-[#C21642]' : 'text-gray-400 hover:text-gray-600'}`}>売上実績</button>
                  <button onClick={() => setActiveMetric('billingCount')} className={`px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeMetric === 'billingCount' ? 'bg-white shadow-xl text-[#C21642]' : 'text-gray-400 hover:text-gray-600'}`}>請求件数</button>
                </div>
              </div>
              
              <div className="h-[480px]">
                <ResponsiveContainer width="100%" height="100%">
                  {selectedStores.length >= 2 ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} stroke="#E5E7EB" interval={0} angle={-15} textAnchor="end" />
                      <YAxis tickFormatter={(v) => activeMetric === 'salesExTax' ? `¥${v/1000}k` : v} tick={{ fontSize: 10, fill: '#9CA3AF' }} stroke="#E5E7EB" />
                      <Tooltip 
                        cursor={{ fill: 'rgba(194, 22, 66, 0.04)' }}
                        contentStyle={{ borderRadius: '0', border: '1px solid #C21642', fontSize: '12px', fontWeight: 'black', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', padding: '12px' }}
                        formatter={(val: number) => activeMetric === 'salesExTax' ? formatCurrency(val) : `${val} UNIT`}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'black', paddingTop: '30px', textTransform: 'uppercase' }} iconType="rect" />
                      {selectedStores.map((s, i) => (
                        <Bar key={s.id} dataKey={s.name} fill={['#C21642', '#111827', '#6B7280', '#D1D5DB', '#FCD34D'][i % 5]} barSize={14} radius={[1,1,0,0]} isAnimationActive={true} animationDuration={1000} />
                      ))}
                    </BarChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} stroke="#E5E7EB" interval={0} angle={-15} textAnchor="end" />
                      <YAxis tickFormatter={(v) => activeMetric === 'salesExTax' ? `¥${v/1000}k` : v} tick={{ fontSize: 10, fill: '#9CA3AF' }} stroke="#E5E7EB" />
                      <Tooltip 
                        cursor={{ fill: 'rgba(194, 22, 66, 0.04)' }}
                        contentStyle={{ borderRadius: '0', border: '1px solid #C21642', fontSize: '12px', fontWeight: 'black', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
                        formatter={(val: number) => activeMetric === 'salesExTax' ? formatCurrency(val) : `${val} UNIT`}
                      />
                      <Bar dataKey="value" barSize={42} radius={[1,1,0,0]} isAnimationActive={true} animationDuration={1200}>
                        {chartData.map((_, i) => <Cell key={i} fill={i === 0 ? '#C21642' : i < 6 ? '#111827' : '#E5E7EB'} />)}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* 詳細データテーブル */}
            <div className="bg-white shadow-2xl border border-gray-200 overflow-hidden rounded-sm">
              <div className="bg-gray-900 px-10 py-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <TableIcon size={22} className="text-[#C21642]" />
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.4em]">
                    店舗別詳細実績データベース / PL-Integrated Matrix
                  </h3>
                </div>
                <button className="text-[10px] font-black text-[#C21642] border-2 border-[#C21642] px-8 py-2.5 hover:bg-[#C21642] hover:text-white transition-all uppercase tracking-[0.2em] shadow-lg shadow-[#C21642]/10">
                  Export Dataset
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b-2 border-gray-100">
                      <th className="px-8 py-6 sticky left-0 bg-gray-50 z-10 border-r-2 border-gray-200">店舗名称</th>
                      <th className="px-6 py-6 border-r border-gray-100">業態</th>
                      <th className="px-6 py-6 text-right border-r border-gray-100">総売上(税別)</th>
                      <th className="px-6 py-6 text-right border-r border-gray-100">前月比</th>
                      {OPTIONS_LIST.slice(0, 10).map(o => <th key={o.id} className="px-4 py-6 text-center border-r border-gray-100 font-black bg-gray-50/50">{o.name}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredData.map((s, idx) => (
                      <tr key={s.id} className={`hover:bg-[#C21642]/5 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                        <td className="px-8 py-6 font-black text-gray-900 sticky left-0 z-10 border-r-2 border-gray-100 bg-inherit shadow-[10px_0_20px_rgba(0,0,0,0.03)]">{s.name}</td>
                        <td className="px-6 py-6 border-r border-gray-100">
                          <span className={`px-2.5 py-1 rounded-sm font-black text-[9px] border shadow-sm ${s.type === '赤' ? 'bg-[#C21642] text-white border-[#C21642]' : 'bg-white text-gray-500 border-gray-200'}`}>{s.type}</span>
                        </td>
                        <td className="px-6 py-6 text-right font-black text-gray-900 border-r tracking-tighter">{formatCurrency(s.summary.totalSales)}</td>
                        <td className={`px-6 py-6 text-right border-r font-black text-[11px] ${s.summary.prevDiff >= 0 ? 'text-[#C21642]' : 'text-gray-400'}`}>
                          {s.summary.prevDiff >= 0 ? '▲' : '▼'} {Math.abs(s.summary.prevDiff).toLocaleString()}
                        </td>
                        {OPTIONS_LIST.slice(0, 10).map(opt => {
                          const t = s.options.find(o => o.id === opt.id);
                          return (
                            <td key={opt.id} className="px-4 py-6 text-center border-r last:border-none">
                              {t?.isContracted ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[12px] font-black text-gray-900 tracking-tighter">¥{(t.salesExTax/1000).toFixed(0)}k</span>
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{t.billingCount} UNIT</span>
                                </div>
                              ) : <span className="text-gray-200 font-black italic tracking-tighter">---</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;