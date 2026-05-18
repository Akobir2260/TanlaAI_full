import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Users, Image,
  TrendingUp, Eye, Plus, RefreshCw, 
  CheckCircle2, Clock, MousePointer2, ChevronRight,
  Activity, Building2, DollarSign, ArrowUpRight, Trophy, CreditCard
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid } from 'recharts';
import apiClient from '../../api/client';
import { cn } from '../../utils/cn';

type RecentItem = {
  id: number;
  name?: string;
  product_name?: string;
  user_name?: string;
  created_at?: string;
  status?: string;
  ai_status?: string;
  image?: string;
};

type DashboardData = {
  counts: {
    product_count: number;
    category_count: number;
    company_count: number;
    user_count: number;
    banner_count: number;
    lead_count: number;
    ai_result_count: number;
    ai_error_count: number;
    active_promotions: number;
  };
  monetization: {
    pending_payment: number;
    waiting_confirmation: number;
    active: number;
    expired: number;
  };
  growth: {
    products: number;
    companies: number;
    users: number;
    leads: number;
    ai_results: number;
  };
  billing: {
    server_due_date: string | null;
    server_cost: number;
    server_note: string;
    server_days_left: number | null;
    ai_due_date: string | null;
    ai_cost_per_request_usd: number;
    ai_cost_per_request_uzs: number;
    usd_to_uzs_rate: number;
    ai_monthly_budget_uzs: number;
    ai_total_requests: number;
    ai_cost_total_uzs: number;
    ai_cost_this_month_uzs: number;
    ai_cost_today_uzs: number;
    ai_days_left: number | null;
  };
  financials: {
    income_today: number;
    income_month: number;
    income_total: number;
    profit_today: number;
    profit_month: number;
    profit_total: number;
    top_companies: {
      id: number;
      name: string;
      total_paid: number;
      logo: string | null;
    }[];
    chart_data: {
      date: string;
      income: number;
    }[];
  };
  ai_status: Record<string, number>;
  ai_performance: {
    success_rate: number;
    avg_time: number;
  };
  recent_activity: {
    products: RecentItem[];
    ai_results: RecentItem[];
    leads: RecentItem[];
  };
};

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#cbd5e1'];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('admin/dashboard/')
      .then(({ data }) => setData(data))
      .catch(err => console.error("Dashboard fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#0067a5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const chartData = [
    { name: 'Tayyor', value: data.ai_status?.completed || 0 },
    { name: 'Jarayonda', value: data.ai_status?.processing || 0 },
    { name: 'Xato', value: data.ai_status?.error || 0 },
    { name: 'Kutilmoqda', value: data.ai_status?.none || 0 },
  ].filter(d => d.value > 0);

  const monetizationStats = [
    { label: 'Aktiv Komp.', value: data.monetization?.active ?? 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Kutilmoqda', value: data.monetization?.waiting_confirmation ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'To\'lamagan', value: data.monetization?.pending_payment ?? 0, icon: Users, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Muddati o\'tgan', value: data.monetization?.expired ?? 0, icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  const stats = [
    { label: 'Mahsulotlar', value: data.counts?.product_count ?? 0, growth: data.growth?.products ?? 0, icon: Package, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Kompaniyalar', value: data.counts?.company_count ?? 0, growth: data.growth?.companies ?? 0, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Lidlar (Leads)', value: data.counts?.lead_count ?? 0, growth: data.growth?.leads ?? 0, icon: MousePointer2, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Foydalanuvchilar', value: data.counts?.user_count ?? 0, growth: data.growth?.users ?? 0, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const getStatusColor = (days: number | null) => {
    if (days === null) return 'text-slate-400';
    if (days <= 0) return 'text-red-600';
    if (days <= 3) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getStatusBg = (days: number | null) => {
    if (days === null) return 'bg-slate-50';
    if (days <= 0) return 'bg-red-50';
    if (days <= 3) return 'bg-amber-50';
    return 'bg-emerald-50';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">SaaS Control Panel</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Real-vaqt tizim monitoringi va moliyaviy tahlil</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/adminka/payments" className="px-5 py-2.5 bg-[#0067a5] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#005a91] transition-all shadow-lg shadow-blue-900/10 flex items-center gap-2">
            <CreditCard size={16} /> To'lovlarni Boshqarish
          </Link>
          <Link to="/adminka/system" className="px-5 py-2.5 bg-white border border-slate-100 rounded-2xl text-[11px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
            <Plus size={16} /> Tizim Sozlamalari
          </Link>
          <button onClick={() => window.location.reload()} className="p-2.5 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-[#0067a5] transition-colors shadow-sm">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* ── SaaS Financial Overview ────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Income Card */}
        <div className="xl:col-span-2 bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <DollarSign size={160} />
          </div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Jami Daromad</p>
              <h2 className="text-4xl font-black">{data.financials?.income_total?.toLocaleString() ?? 0} <span className="text-sm font-medium text-slate-500">uzs</span></h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                 <ArrowUpRight size={12} /> {(data.growth?.companies ?? 0).toFixed(1)}% Trend
              </div>
            </div>
            
            <div className="md:col-span-2 flex flex-col md:flex-row gap-6 md:items-end justify-between">
               <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Bugun</p>
                      <p className="text-lg font-black text-white">{data.financials?.income_today?.toLocaleString() ?? 0}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Bu oy</p>
                      <p className="text-lg font-black text-emerald-400">{data.financials?.income_month?.toLocaleString() ?? 0}</p>
                    </div>
                  </div>
                  
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.financials?.chart_data ?? []}>
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                        <Tooltip 
                           contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px', color: '#fff'}}
                           itemStyle={{color: '#10b981'}}
                        />
                        <Bar dataKey="income" fill="url(#barGradient)" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col space-y-8">
           <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Foyda Tahlili</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">SaaS Net Profit</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                <TrendingUp size={24} />
              </div>
           </div>

           <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="text-center">
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Bu oydagi foyda</p>
                 <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
                   {(data.financials?.profit_month ?? 0) > 0 ? '+' : ''}{(data.financials?.profit_month ?? 0).toLocaleString()}
                 </h2>
                 <p className="text-xs font-bold text-slate-400 mt-2">Xarajatlar ayirilgan holda</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Bugun</p>
                    <p className={cn("text-base font-black", (data.financials?.profit_today ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {(data.financials?.profit_today ?? 0) > 0 ? '+' : ''}{(data.financials?.profit_today ?? 0).toLocaleString()}
                    </p>
                 </div>
                 <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Umumiy</p>
                    <p className={cn("text-base font-black", (data.financials?.profit_total ?? 0) >= 0 ? "text-[#0067a5]" : "text-rose-600")}>
                      {(data.financials?.profit_total ?? 0) > 0 ? '+' : ''}{(data.financials?.profit_total ?? 0).toLocaleString()}
                    </p>
                 </div>
              </div>
           </div>

           <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95">
              Hisobotni yuklash (.pdf)
           </button>
        </div>
      </div>

      {/* ── SaaS Operational Rows ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Status Card */}
        <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8 group">
          <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:rotate-6", getStatusBg(data.billing?.server_days_left ?? null))}>
            <Activity size={36} className={getStatusColor(data.billing?.server_days_left ?? null)} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">💻 Server holati</p>
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              {(data.billing?.server_cost ?? 0).toLocaleString()} <span className="text-sm font-medium text-slate-400">uzs/oy</span>
            </h3>
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Keyingi to'lov</span>
                <span className="text-sm font-black text-slate-700">{data.billing?.server_due_date || "Noma'lum"}</span>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Status</span>
                <span className={cn("text-sm font-black", getStatusColor(data.billing?.server_days_left ?? null))}>
                  {data.billing?.server_days_left === null || data.billing?.server_days_left === undefined ? 'Noma\'lum' : 
                   data.billing.server_days_left <= 0 ? '🔴 BUGUN TO\'LASH KERAK' :
                   data.billing.server_days_left <= 3 ? `🟡 ${data.billing.server_days_left} kun qoldi` :
                   `🟢 ${data.billing.server_days_left} kun qoldi`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Cost Tracking Card */}
        <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8 group">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:-rotate-6">
            <Eye size={36} className="text-indigo-600" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">🤖 AI Xarajatlar (Oylik)</p>
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              {(data.billing?.ai_cost_this_month_uzs ?? 0).toLocaleString()} <span className="text-sm font-medium text-slate-400">uzs</span>
            </h3>
            <div className="flex items-center justify-center md:justify-start gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Bugun</span>
                <span className="text-sm font-black text-emerald-500">{(data.billing?.ai_cost_today_uzs ?? 0).toLocaleString()} uzs</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Jami so'rov</span>
                <span className="text-sm font-black text-slate-700">{(data.billing?.ai_total_requests ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Limit</span>
                <span className="text-sm font-black text-indigo-600">
                  {Math.round((data.billing?.ai_cost_this_month_uzs ?? 0) / (data.billing?.ai_monthly_budget_uzs || 1) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monetization Statuses */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {monetizationStats.map((stat) => (
          <div key={stat.label} className={cn("p-4 rounded-3xl border border-transparent shadow-sm flex items-center gap-4", stat.bg)}>
            <div className={cn("p-2.5 rounded-2xl bg-white/80", stat.color)}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
              <p className="text-xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="relative bg-white p-7 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative flex items-center justify-between mb-8">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", s.bg)}>
                <s.icon size={28} className={s.color} />
              </div>
              <div className="flex flex-col items-end">
                <span className={cn(
                  "text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1",
                  s.growth >= 0 ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
                )}>
                  <TrendingUp size={12} className={s.growth >= 0 ? "" : "rotate-180"} /> 
                  {s.growth >= 0 ? '+' : ''}{s.growth}%
                </span>
              </div>
            </div>
            
            <div className="relative">
              <p className="text-4xl font-black text-slate-900 tracking-tighter mb-1">
                {s.value !== undefined ? s.value.toLocaleString() : '0'}
              </p>
              <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Health Widget */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">AI Status Health</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Sifat darajasi</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
              <Activity size={24} />
            </div>
          </div>
          
          <div className="h-[280px] w-full flex items-center justify-center relative bg-slate-50/30 rounded-[32px] overflow-hidden">
            <PieChart width={320} height={280}>
              <Pie
                data={chartData}
                innerRadius={70}
                outerRadius={95}
                paddingAngle={8}
                dataKey="value"
                animationBegin={0}
                animationDuration={1000}
                cx="50%"
                cy="50%"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '24px', 
                  border: 'none', 
                  boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                  padding: '12px 16px'
                }}
              />
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-[-5px]">
              <span className="text-4xl font-black text-slate-900 tracking-tighter">{data.ai_performance?.success_rate ?? 100}%</span>
              <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em] mt-1">Success</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-10">
            <div className="p-5 bg-slate-50/80 rounded-[24px] border border-slate-100">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">O'rtacha vaqt</p>
              <div className="flex items-center gap-2 text-slate-900">
                <div className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <span className="text-xl font-black">{data.ai_performance?.avg_time ?? 0}s</span>
              </div>
            </div>
            <div className="p-5 bg-slate-50/80 rounded-[24px] border border-slate-100">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Jami Renderlar</p>
              <div className="flex items-center gap-2 text-slate-900">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-xl font-black">{data.counts?.ai_result_count ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Companies Widget */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                <Trophy size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Top Kompaniyalar</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Daromad keltirish (LTV) bo'yicha</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            {data.financials?.top_companies?.length ? data.financials.top_companies.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100/80 rounded-[28px] transition-all group">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center text-slate-400 font-black relative overflow-hidden">
                      {c.logo ? <img src={c.logo} alt="" className="w-full h-full object-contain p-2" /> : c.name.charAt(0)}
                      <div className="absolute top-0 left-0 w-6 h-6 bg-slate-900 text-white text-[10px] flex items-center justify-center rounded-br-xl border-b border-r border-white/20 font-black">{i+1}</div>
                   </div>
                   <div>
                      <p className="text-base font-black text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-70">Hamkor Kompaniya</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-lg font-black text-slate-900">{(c.total_paid || 0).toLocaleString()} <span className="text-xs font-medium text-slate-400">uzs</span></p>
                   <div className="inline-flex items-center gap-1 text-[9px] text-emerald-500 font-black uppercase tracking-widest mt-1">
                      <CheckCircle2 size={10} /> Tasdiqlangan
                   </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                <Building2 size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">Ma'lumotlar mavjud emas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content & Actions (Original Recent Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Products */}
          <div className="bg-white p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
                  <Package size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">So'nggi mahsulotlar</h3>
              </div>
              <Link to="/adminka/products" className="text-xs font-black text-[#0067a5] hover:underline flex items-center gap-1 bg-sky-50 px-3 py-1.5 rounded-full">
                Barchasi <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(data.recent_activity?.products?.length ?? 0) > 0 ? (
                data.recent_activity.products.map((p) => {
                  const imageUrl = p.image;

                  return (
                    <div key={p.id} className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 hover:bg-white hover:shadow-lg transition-all duration-300">
                      <div className="w-14 h-14 bg-white rounded-xl overflow-hidden border border-slate-100 p-1 flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            className="w-full h-full object-contain"
                            alt={p.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjY2JkNWUxIiBmb250LXNpemU9IjEwIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300"><Image size={20} /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 line-clamp-1">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                            p.ai_status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                          )}>
                            {p.ai_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 py-8 text-center text-slate-400 font-medium">Ma'lumot topilmadi</div>
              )}
            </div>
          </div>

          {/* AI Activity & Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-3 bg-white p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Real-vaqt faollik</h3>
              <div className="space-y-6">
                {data.recent_activity.ai_results.map((ai) => (
                  <div key={ai.id} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-slate-500 font-black text-xs">
                      {ai.user_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-slate-800">
                        <span className="font-black">{ai.user_name}</span> mahsulotni vizualizatsiya qildi: <span className="text-[#0067a5] font-black">{ai.product_name}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-1">
                        <Clock size={10} /> {new Date(ai.created_at || '').toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col gap-4">
              <Link to="/adminka/products?action=add" className="flex-1 p-6 bg-[#0067a5] text-white rounded-[32px] flex flex-col items-center justify-center gap-3 hover:bg-[#005a91] transition-all shadow-xl shadow-blue-900/10 active:scale-95">
                <Plus size={32} />
                <span className="text-xs font-black uppercase tracking-widest">Qo'shish</span>
              </Link>
              <Link to="/adminka/leads" className="flex-1 p-6 bg-white border border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                <MousePointer2 size={32} className="text-emerald-500" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Lidlar</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
