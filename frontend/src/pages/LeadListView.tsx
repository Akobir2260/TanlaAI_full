import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox, Phone, MessageCircle, Ruler, CheckCircle2,
  Calendar, User as UserIcon, Clock, Package, ChevronLeft,
} from 'lucide-react';
import apiClient from '../api/client';
import { useTelegram } from '../contexts/useTelegram';
import type { ApiListResponse, LeadRequest, LeadType } from '../types';

/* ── helpers ─────────────────────────────────────────────────── */
const LEAD_META: Record<LeadType, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  call:        { label: "Qo'ng'iroq",    color: '#34C759', bg: 'rgba(52,199,89,0.1)',   icon: <Phone size={16} />       },
  telegram:    { label: 'Telegram',      color: '#0088cc', bg: 'rgba(0,136,204,0.1)',  icon: <MessageCircle size={16} /> },
  measurement: { label: "O'lchash",      color: '#FF6B35', bg: 'rgba(255,107,53,0.1)', icon: <Ruler size={16} />        },
  visualize:   { label: 'AI Vizual',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', icon: <MessageCircle size={16} /> },
};

const fmtDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const fmtTime = (s: string) => {
  const d = new Date(s);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/* ── Skeleton ────────────────────────────────────────────────── */
const LeadSkeleton = () => (
  <div
    className="rounded-[20px] overflow-hidden"
    style={{
      height: 130,
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }}
  />
);

/* ── Lead Card ───────────────────────────────────────────────── */
const LeadCard: React.FC<{
  lead: LeadRequest;
  onToggle: () => void;
}> = ({ lead, onToggle }) => {
  const meta  = LEAD_META[lead.lead_type] ?? LEAD_META.call;
  const phone = lead.phone;

  return (
    <div
      className="bg-white rounded-[20px] p-4 transition-all duration-300"
      style={{
        boxShadow: lead.is_processed
          ? '0 2px 8px rgba(26,26,46,0.04)'
          : '0 6px 24px rgba(26,26,46,0.10)',
        opacity: lead.is_processed ? 0.65 : 1,
        border: lead.is_processed ? '1.5px solid rgba(26,26,46,0.05)' : `1.5px solid ${meta.color}22`,
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{ background: meta.bg, color: meta.color }}
          >
            {meta.icon}
          </div>
          <div>
            <span
              className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            {lead.product_name && (
              <div className="flex items-center gap-1 mt-0.5">
                <Package size={10} color="#C0C0CE" />
                <p className="text-[11px] text-[#8A8A99] font-medium truncate max-w-[160px]">{lead.product_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Check/done button */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-black active:scale-90 transition-all"
          style={lead.is_processed
            ? { background: 'rgba(52,199,89,0.12)', color: '#34C759' }
            : { background: 'rgba(26,26,46,0.06)', color: '#8A8A99' }
          }
        >
          <CheckCircle2 size={13} />
          {lead.is_processed ? "Ko'rildi" : "Ko'rish"}
        </button>
      </div>

      {/* Info block */}
      <div
        className="rounded-[14px] p-3 space-y-2"
        style={{ background: 'rgba(26,26,46,0.03)' }}
      >
        {/* User */}
        <div className="flex items-center gap-2">
          <UserIcon size={13} color="#C0C0CE" />
          <span className="text-[12px] font-bold text-[#1A1A2E]">
            {lead.user_details?.first_name || "Noma'lum mijoz"}
            {lead.user_details?.username && (
              <span className="text-[#B0B0BF] font-medium"> @{lead.user_details.username}</span>
            )}
          </span>
        </div>

        {/* Phone */}
        {phone && (
          <div className="flex items-center gap-2">
            <Phone size={13} color="#34C759" />
            <a
              href={`tel:${phone}`}
              className="text-[13px] font-black"
              style={{ color: '#34C759' }}
            >
              {phone}
            </a>
          </div>
        )}

        {/* Message */}
        {lead.message && (
          <div className="pt-2 border-t border-[rgba(26,26,46,0.06)]">
            <p className="text-[12px] text-[#5A5A6E] leading-relaxed italic">"{lead.message}"</p>
          </div>
        )}

        {/* Price info */}
        {lead.price_info && (
          <div className="pt-1">
            <p className="text-[11px] font-bold text-[#FF6B35]">💰 {lead.price_info}</p>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="flex items-center gap-3 mt-2.5">
        <div className="flex items-center gap-1">
          <Calendar size={11} color="#C0C0CE" />
          <span className="text-[10px] text-[#C0C0CE] font-bold">{fmtDate(lead.created_at)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={11} color="#C0C0CE" />
          <span className="text-[10px] text-[#C0C0CE] font-bold">{fmtTime(lead.created_at)}</span>
        </div>
      </div>
    </div>
  );
};

/* ── Filters ─────────────────────────────────────────────────── */
type Filter = 'all' | 'new' | 'done';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',  label: 'Barchasi'  },
  { key: 'new',  label: 'Yangi'     },
  { key: 'done', label: "Ko'rilgan" },
];

/* ── Page ────────────────────────────────────────────────────── */
const LeadListView: React.FC = () => {
  const [leads,   setLeads]   = useState<LeadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<Filter>('all');
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await apiClient.get<ApiListResponse<LeadRequest> | LeadRequest[]>('/leads/');
        setLeads(Array.isArray(res.data) ? res.data : res.data.results ?? []);
      } catch (err) {
        console.error('Error fetching leads:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  const toggle = async (leadId: number, current: boolean) => {
    haptic('light');
    try {
      await apiClient.patch(`/leads/${leadId}/`, { is_processed: !current });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, is_processed: !current } : l));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = leads.filter(l => {
    if (filter === 'new')  return !l.is_processed;
    if (filter === 'done') return  l.is_processed;
    return true;
  });

  const newCount  = leads.filter(l => !l.is_processed).length;
  const doneCount = leads.filter(l =>  l.is_processed).length;

  return (
    <div style={{ background: '#FFFBF6' }} className="min-h-screen pb-28">
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>

      {/* Header */}
      <div className="relative px-4 pt-6 pb-4">
        {/* Back Button */}
        <button 
          onClick={() => { haptic('light'); navigate(-1); }}
          className="absolute left-4 top-6 w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm border border-slate-100 active:scale-90 transition-transform z-10"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>

        <div className="flex items-center justify-between mb-1 pl-12">
          <h1 className="text-[22px] font-black text-[#1A1A2E]">Mijoz so'rovlari</h1>
          {newCount > 0 && (
            <span
              className="text-[13px] font-black text-white px-3 py-1 rounded-full"
              style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6B35)' }}
            >
              {newCount} yangi
            </span>
          )}
        </div>
        <p className="text-[12px] font-bold text-[#B0B0BF] uppercase tracking-widest pl-12">
          Jami: {leads.length} ta • Ko'rilgan: {doneCount} ta
        </p>
      </div>

      {/* Filter tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { haptic('light'); setFilter(f.key); }}
              className="flex-1 py-2.5 rounded-[14px] text-[12px] font-black transition-all active:scale-95"
              style={filter === f.key
                ? { background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', color: '#fff', boxShadow: '0 4px 14px rgba(255,107,53,0.28)' }
                : { background: '#fff', color: '#8A8A99', border: '1.5px solid rgba(26,26,46,0.08)' }
              }
            >
              {f.label}
              {f.key === 'new' && newCount > 0 && (
                <span className="ml-1 text-[10px]">({newCount})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        {loading ? (
          [1,2,3,4].map(i => <LeadSkeleton key={i} />)
        ) : filtered.length > 0 ? (
          filtered.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onToggle={() => toggle(lead.id, lead.is_processed)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div
              className="w-20 h-20 rounded-[24px] flex items-center justify-center"
              style={{ background: 'rgba(255,107,53,0.08)' }}
            >
              <Inbox size={32} color="#FF6B35" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[18px] font-black text-[#1A1A2E] mb-1">
                {filter === 'new' ? 'Yangi so\'rov yo\'q' :
                 filter === 'done' ? "Ko'rilgan so'rov yo'q" :
                 'Hali so\'rov yo\'q'}
              </h3>
              <p className="text-[13px] text-[#B0B0BF] font-medium">
                {filter === 'all' ? 'Mahsulotlaringiz bosilganda bu yerda ko\'rinadi' : 'Boshqa filtr tanlang'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadListView;
