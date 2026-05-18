import React, { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Package, Inbox, Settings, PlusCircle, ChevronRight,
  TrendingUp, Phone, MessageCircle, Play,
  MapPin, Edit3, Eye, Store, Clock, AlertTriangle
} from 'lucide-react';
import apiClient from '../api/client';
import { getMediaUrl } from '../utils/media';
import type { ApiListResponse, Company, LeadRequest, Product } from '../types';
import { useTelegram } from '../contexts/useTelegram';

/* ── Skeleton ───────────────────────────────────────────────── */
const Skeleton = ({ h = 60, r = 16 }: { h?: number; r?: number }) => (
  <div
    className="w-full"
    style={{
      height: h,
      borderRadius: r,
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }}
  />
);

/* ── Stat Card ──────────────────────────────────────────────── */
const StatCard: React.FC<{
  icon: React.ReactElement;
  value: number | string;
  label: string;
  color: string;
  onClick?: () => void;
}> = ({ icon, value, label, color, onClick }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className="flex flex-col p-4 rounded-[20px] text-left active:scale-95 transition-transform disabled:active:scale-100"
    style={{ border: `1.5px solid ${color}22` }}
  >
    <div
      className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3"
      style={{ background: `${color}18` }}
    >
      <span style={{ color }}>{icon}</span>
    </div>
    <p className="text-[24px] font-black leading-none" style={{ color: '#1A1A2E' }}>{value}</p>
    <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: '#8A8A99' }}>{label}</p>
  </button>
);

/* ── Product Row ────────────────────────────────────────────── */
const ProductRow: React.FC<{ product: Product; onEdit: () => void }> = ({ product, onEdit }) => {
  const primaryImage =
    product.images?.find(i => i.is_main)?.image ||
    product.original_image ||
    product.image;

  const price = product.price
    ? `${Number(product.price).toLocaleString()} so'm`
    : product.price_per_m2
    ? `${Number(product.price_per_m2).toLocaleString()} / m²`
    : 'Kelishilgan';

  return (
    <div
      className="flex items-center gap-3 bg-white p-3 rounded-[16px]"
      style={{ boxShadow: '0 2px 12px rgba(26,26,46,0.06)' }}
    >
      <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-[#f5f0eb] flex-shrink-0">
        <img src={getMediaUrl(primaryImage) || ''} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#1A1A2E] truncate">{product.name}</p>
        <p className="text-[11px] font-black" style={{ color: '#FF6B35' }}>{price}</p>
      </div>
      <button
        onClick={onEdit}
        className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
        style={{ background: 'rgba(255,107,53,0.08)' }}
      >
        <Edit3 size={14} color="#FF6B35" />
      </button>
    </div>
  );
};

/* ── Main ───────────────────────────────────────────────────── */
const CreatorDashboard: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<LeadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate  = useNavigate();
  const { haptic, setViewMode } = useTelegram();

  useEffect(() => {
    const fetch = async () => {
      try {
        const [companyRes, productsRes, leadsRes] = await Promise.all([
          apiClient.get<Company>('/companies/my/'),
          apiClient.get<ApiListResponse<Product> | Product[]>('/products/my/'),
          apiClient.get<ApiListResponse<LeadRequest> | LeadRequest[]>('/leads/'),
        ]);
        setCompany(companyRes.data);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : productsRes.data.results ?? []);
        setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : leadsRes.data.results ?? []);
      } catch (err: unknown) {
        if (isAxiosError(err) && err.response?.status === 404) {
          // If company not found, user is not a seller, redirect to home
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [navigate]);

  const newLeads = leads.filter(l => !l.is_processed).length;

  if (loading) {
    return (
      <div style={{ background: '#FFFBF6' }} className="min-h-screen px-4 pt-6 space-y-4">
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        <Skeleton h={100} r={24} />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton h={100} r={20} />
          <Skeleton h={100} r={20} />
          <Skeleton h={100} r={20} />
        </div>
        <Skeleton h={60} r={18} />
        <Skeleton h={60} r={18} />
        <Skeleton h={60} r={18} />
      </div>
    );
  }

  const daysLeft = (() => {
    if (!company) return 0;
    if (company.status === 'trial' && company.trial_ends_at) {
      return Math.max(0, Math.ceil((new Date(company.trial_ends_at).getTime() - Date.now()) / 86400000));
    }
    if (company.subscription_deadline) {
      return Math.max(0, Math.ceil((new Date(company.subscription_deadline).getTime() - Date.now()) / 86400000));
    }
    return 0;
  })();
  const showBanner = company && (company.status === 'trial' || (company.status === 'active' && !!company.subscription_deadline));

  const aiUsage = company?.ai_usage ?? leads.filter(l => l.lead_type === 'visualize').length;

  return (
    <div style={{ background: '#FFFBF6' }} className="min-h-screen pb-28">
      <style>{`
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes pulse-slow{0%,100%{opacity:1}50%{opacity:0.7}}
      `}</style>

      {/* ── Trial / Subscription Banner ── */}
      {showBanner && (
        <div className="px-4 pt-4">
          <div 
            className={`flex flex-col gap-3 p-4 rounded-[24px] shadow-sm animate-in fade-in slide-in-from-top-2 duration-500`}
            style={{ 
              background: daysLeft <= 0 ? 'rgba(255,45,85,0.12)' : daysLeft <= 3 ? 'rgba(255,45,85,0.08)' : 'rgba(255,107,53,0.08)',
              border: `1px solid ${daysLeft <= 0 ? 'rgba(255,45,85,0.2)' : daysLeft <= 3 ? 'rgba(255,45,85,0.1)' : 'rgba(255,107,53,0.1)'}`
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center"
                  style={{ background: daysLeft <= 3 ? '#FF2D55' : '#FF6B35' }}
                >
                  <Clock size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-black" style={{ color: daysLeft <= 3 ? '#FF2D55' : '#FF6B35' }}>
                    {daysLeft === 0
                      ? (company?.status === 'trial' ? 'Sinov muddati tugagan' : 'To\'lov muddati tugagan')
                      : company?.status === 'trial' ? `Sinov muddati: ${daysLeft} kun qoldi` : `Obuna: ${daysLeft} kun qoldi`}
                  </p>
                  <p className="text-[10px] font-bold text-[#8A8A99] uppercase tracking-wider">
                    {company.subscription_deadline ? new Date(company.subscription_deadline).toLocaleDateString() : 'Muddatsiz'} gacha
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { haptic('medium'); navigate('/subscription'); }}
                className="px-4 py-2 rounded-xl text-[11px] font-black text-white active:scale-95 transition-transform shadow-md"
                style={{ background: daysLeft <= 3 ? '#FF2D55' : '#FF6B35' }}
              >
                {daysLeft === 0 ? 'To\'lov qilish' : 'Yaxshilash'}
              </button>
            </div>

            {daysLeft <= 0 && (
              <div className="flex items-start gap-2.5 p-3 bg-white/50 rounded-[16px] border border-red-200/50">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] font-bold text-red-600 leading-relaxed">
                  DIQQAT: To'lov muddati tugagani sababli do'koningiz va mahsulotlaringiz xaridorlarga ko'rinmayapti. Faollashtirish uchun to'lov qiling.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Company hero card ── */}
      <div className="px-4 pt-6 mb-5">
        <div
          className="relative overflow-hidden rounded-[24px] p-5"
          style={{
            background: 'linear-gradient(135deg, #1A1A2E 0%, #2D2D4E 100%)',
            boxShadow: '0 12px 40px rgba(26,26,46,0.30)',
          }}
        >
          {/* Decorative blob */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
            style={{ background: '#FF6B35', transform: 'translate(30%,-30%)' }}
          />

          <div className="flex items-center gap-4 relative">
            {/* Logo */}
            <div
              className="w-16 h-16 rounded-[18px] overflow-hidden flex-shrink-0 border-2 border-white/20"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              {company?.logo ? (
                <img src={getMediaUrl(company.logo)} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[24px] font-black">
                  {company?.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-[18px] font-black text-white truncate">{company?.name}</h2>
                {company?.is_currently_active && daysLeft > 0 ? (
                  <span
                    className="flex-shrink-0 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,180,140,0.8)' }}
                  >
                    FAOL
                  </span>
                ) : (
                  <span
                    className="flex-shrink-0 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,45,85,0.8)' }}
                  >
                    YOPILGAN
                  </span>
                )}
              </div>
              {company?.location && (
                <div className="flex items-center gap-1">
                  <MapPin size={11} color="rgba(255,255,255,0.5)" />
                  <span className="text-[12px] text-white/50 font-medium truncate">{company.location}</span>
                </div>
              )}
              {/* Social */}
              <div className="flex items-center gap-2 mt-2">
                {company?.phone && (
                  <button
                    onClick={() => { haptic('light'); window.location.href = `tel:${company.phone}`; }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black active:opacity-70"
                    style={{ background: 'rgba(52,199,89,0.2)', color: '#34C759' }}
                  >
                    <Phone size={10} /> Qo'ng'iroq
                  </button>
                )}
                {company?.telegram_link && (
                  <button
                    onClick={() => { haptic('light'); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black active:opacity-70"
                    style={{ background: 'rgba(0,136,204,0.2)', color: '#0088cc' }}
                  >
                    <MessageCircle size={10} /> TG
                  </button>
                )}
                {company?.youtube_link && (
                  <button
                    onClick={() => { haptic('light'); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black active:opacity-70"
                    style={{ background: 'rgba(255,0,0,0.15)', color: '#FF0000' }}
                  >
                    <Play size={10} /> YT
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { haptic('light'); navigate('/creator/studio/edit'); }}
                className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                style={{ background: 'rgba(255,255,255,0.10)' }}
              >
                <Settings size={17} color="rgba(255,255,255,0.6)" />
              </button>
              <button
                onClick={() => { haptic('medium'); setViewMode('buyer'); navigate('/'); }}
                className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                style={{ background: 'rgba(255,255,255,0.15)' }}
                title="Xaridor bo'limiga o'tish"
              >
                <Store size={17} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="px-4 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Package />}
            value={products.length}
            label="Mahsulot"
            color="#FF6B35"
            onClick={() => navigate('/creator/product/add')}
          />
          <StatCard
            icon={<Inbox />}
            value={leads.length}
            label="Jami lead"
            color="#8B5CF6"
            onClick={() => navigate('/creator/leads')}
          />
          <StatCard
            icon={<TrendingUp />}
            value={aiUsage}
            label="AI Vizual"
            color="#FF2D55"
            onClick={() => navigate('/creator/leads')}
          />
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="px-4 mb-5 space-y-3">
        {/* Add product — primary CTA */}
        <button
          onClick={() => { haptic('medium'); navigate('/creator/product/add'); }}
          className="w-full flex items-center justify-between p-4 rounded-[20px] active:scale-[0.97] transition-transform"
          style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', boxShadow: '0 8px 24px rgba(255,107,53,0.32)' }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.20)' }}>
              <PlusCircle size={20} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-[14px] font-black text-white">Yangi mahsulot qo'shish</p>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Katalogga chiqarish</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-white/60" />
        </button>

        {/* Leads */}
        <button
          onClick={() => { haptic('light'); navigate('/creator/leads'); }}
          className="w-full flex items-center justify-between p-4 rounded-[20px] active:scale-[0.97] transition-transform bg-white"
          style={{ boxShadow: '0 4px 16px rgba(26,26,46,0.06)' }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
              <Inbox size={20} color="#8B5CF6" />
            </div>
            <div className="text-left">
              <p className="text-[14px] font-black text-[#1A1A2E]">Mijoz so'rovlari</p>
              <p className="text-[10px] text-[#8A8A99] font-bold uppercase tracking-wider">
                {newLeads > 0 ? `${newLeads} ta yangi so'rov` : "Hammasi ko'rilgan"}
              </p>
            </div>
          </div>
          {newLeads > 0 && (
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6B35)' }}
            >
              {newLeads}
            </span>
          )}
          {newLeads === 0 && <ChevronRight size={18} color="#C0C0CE" />}
        </button>



        {/* View my company page */}
        {company && (
          <button
            onClick={() => { haptic('light'); navigate(`/company/${company.id}`); }}
            className="w-full flex items-center justify-between p-4 rounded-[20px] active:scale-[0.97] transition-transform bg-white"
            style={{ boxShadow: '0 4px 16px rgba(26,26,46,0.06)' }}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: 'rgba(26,26,46,0.06)' }}>
                <Eye size={20} color="#1A1A2E" />
              </div>
              <div className="text-left">
                <p className="text-[14px] font-black text-[#1A1A2E]">Kompaniya sahifam</p>
                <p className="text-[10px] text-[#8A8A99] font-bold uppercase tracking-wider">Xaridor ko'radigan ko'rinish</p>
              </div>
            </div>
            <ChevronRight size={18} color="#C0C0CE" />
          </button>
        )}
      </div>

      {/* ── Products list ── */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-black text-[#1A1A2E]">Mahsulotlarim</h3>
          <button
            onClick={() => { haptic('light'); navigate('/creator/product/add'); }}
            className="text-[11px] font-black px-3 py-1.5 rounded-[10px] active:scale-95 transition-transform"
            style={{ color: '#FF6B35', background: 'rgba(255,107,53,0.1)' }}
          >
            + Qo'shish
          </button>
        </div>

        {products.length > 0 ? (
          <div className="space-y-2.5">
            {products.map(product => (
              <ProductRow
                key={product.id}
                product={product}
                onEdit={() => { haptic('light'); navigate(`/creator/product/edit/${product.id}`); }}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-12 text-center rounded-[20px]"
            style={{ background: 'rgba(26,26,46,0.03)', border: '1.5px dashed rgba(26,26,46,0.10)' }}
          >
            <Package size={28} color="#C0C0CE" strokeWidth={1.5} />
            <p className="text-[13px] font-bold text-[#B0B0BF] mt-2">Hali mahsulot yo'q</p>
            <button
              onClick={() => { haptic('medium'); navigate('/creator/product/add'); }}
              className="mt-3 px-5 py-2.5 rounded-[14px] text-[12px] font-black text-white active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}
            >
              Birinchi mahsulotni qo'shing
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorDashboard;
