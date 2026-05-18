import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Phone, MapPin, ChevronLeft, RefreshCcw, Camera, FileText } from 'lucide-react';
import apiClient from '../api/client';
import { useTelegram } from '../contexts/useTelegram';
import { cn } from '../utils/cn';

const CompanyCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic, refreshProfile } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '+998',
    location: '',
    instagram_link: '',
    telegram_link: '',
    youtube_link: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    
    setLoading(true);
    haptic('medium');
    try {
      const normalizedData = { ...formData };
      ['telegram_link', 'instagram_link'].forEach(key => {
        const val = (normalizedData as any)[key];
        if (val && !val.startsWith('@') && !val.startsWith('http')) {
          (normalizedData as any)[key] = '@' + val.trim();
        }
      });

      if (logoFile) {
        const fd = new FormData();
        Object.entries(normalizedData).forEach(([k, v]) => { if (v) fd.append(k, v); });
        fd.append('logo', logoFile);
        await apiClient.post('companies/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await apiClient.post('companies/', normalizedData);
      }
      haptic('medium');
      
      // Refresh profile to get the new has_company and role state
      await refreshProfile();
      
      haptic('medium');
      // Wait a tick then go to subscription page
      setTimeout(() => navigate('/subscription', { replace: true }), 500);
    } catch (error: unknown) {
      console.error('Error creating company:', error);
      haptic('heavy');
      const errData = (error as { response?: { data?: unknown }; message?: string });
      alert("Kompaniya yaratishda xato: " + JSON.stringify(errData?.response?.data || errData?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#FFFBF6' }}>
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <button 
          onClick={() => { haptic('light'); navigate(-1); }}
          className="w-10 h-10 flex items-center justify-center text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full active:scale-95 transition-all"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="font-bold text-[17px] text-slate-800 tracking-tight">Kompaniya ochish</span>
        <div className="w-10"></div>
      </div>

      <div className="p-5 max-w-xl mx-auto">
        <div className="rounded-[24px] p-6 text-white mb-8 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FF6B35, #FF2D55, #C0175A)', boxShadow: '0 12px 40px rgba(255,107,53,0.30)' }}>
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-15" style={{ background: 'white', transform: 'translate(30%,-30%)' }} />
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-4 border border-white/20 shadow-inner relative">
            <Store size={32} className="text-white drop-shadow-md" />
          </div>
          <h1 className="text-xl font-black mb-1.5 leading-tight">Biznesingizni boshlang!</h1>
          <p className="text-[13px] opacity-90 font-medium px-4">
            Do'koningizni platformaga qo'shing va bugunoq sotuvlarni ko'paytiring.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-3 pb-2">
              <label htmlFor="logo-upload" className="cursor-pointer group">
                <div
                  className="w-24 h-24 rounded-[24px] overflow-hidden flex items-center justify-center relative border-2 border-dashed transition-all"
                  style={{ borderColor: logoPreview ? 'transparent' : 'rgba(255,107,53,0.30)', background: logoPreview ? 'transparent' : 'rgba(255,107,53,0.05)' }}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Camera size={24} color="#FF6B35" />
                      <span className="text-[10px] font-black text-[#FF6B35] uppercase tracking-widest">Logo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-[22px] flex items-center justify-center">
                    <Camera size={20} className="text-white" />
                  </div>
                </div>
              </label>
              <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <p className="text-[10px] text-[#B0B0BF] font-bold uppercase tracking-widest">
                {logoPreview ? 'Logo tanlandi ✓' : 'Logo yuklang (ixtiyoriy)'}
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Kompaniya Nomi *</label>
              <div className="relative">
                <input 
                  required
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Masalan: Elite Eshiklar" 
                  className="w-full h-14 bg-slate-50 rounded-2xl border-none focus:ring-[#FF6B35] pl-11 pr-4 text-[15px] font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                />
                <Store size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Telefon Raqam *</label>
              <div className="relative">
                <input 
                  required
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (!val.startsWith('+998')) val = '+998';
                    const digits = val.slice(4).replace(/\D/g, '').slice(0, 9);
                    setFormData({ ...formData, phone: '+998' + digits });
                  }}
                  placeholder="+998 90 123 45 67" 
                  className="w-full h-14 bg-slate-50 rounded-2xl border-none focus:ring-[#FF6B35] pl-11 pr-4 text-[15px] font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
                />
                <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Manzilingiz</label>
              <div className="relative">
                <textarea
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Falonchi ko'cha, 12-uy..."
                  rows={2}
                  className="w-full py-4 bg-slate-50 rounded-2xl border-none focus:ring-[#FF6B35] pl-11 pr-4 text-[15px] font-bold text-slate-800 transition-all resize-none placeholder:font-medium placeholder:text-slate-400"
                />
                <MapPin size={20} className="absolute left-4 top-4 text-slate-400" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Tavsif (ixtiyoriy)</label>
              <div className="relative">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Do'koningiz haqida qisqacha ma'lumot..."
                  rows={3}
                  className="w-full py-4 bg-slate-50 rounded-2xl border-none focus:ring-[#FF6B35] pl-11 pr-4 text-[15px] font-bold text-slate-800 transition-all resize-none placeholder:font-medium placeholder:text-slate-400"
                />
                <FileText size={20} className="absolute left-4 top-4 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-black text-slate-800 mb-1">Ijtimoiy tarmoqlar</h3>
            
            {/* Instagram */}
            <div className="relative">
              <input 
                type="text" 
                name="instagram_link"
                value={formData.instagram_link}
                onChange={handleChange}
                placeholder="Instagram profilingiz (yoki @username)" 
                className="w-full h-14 bg-pink-50/50 rounded-2xl border-none focus:ring-2 focus:ring-pink-500 pl-11 pr-4 text-[15px] font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-500">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </div>

            {/* Telegram */}
            <div className="relative">
              <input 
                type="text" 
                name="telegram_link"
                value={formData.telegram_link}
                onChange={handleChange}
                placeholder="Telegram manzilingiz (t.me/...)" 
                className="w-full h-14 bg-blue-50/50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 pl-11 pr-4 text-[15px] font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
              />
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500">
                <path d="M21 5L2 12.5L9 16M21 5L18.5 20L9 16M21 5L9 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* YouTube */}
            <div className="relative">
              <input
                type="url"
                name="youtube_link"
                value={formData.youtube_link}
                onChange={handleChange}
                placeholder="YouTube kanal linki (ixtiyoriy)"
                className="w-full h-14 bg-red-50/50 rounded-2xl border-none focus:ring-2 focus:ring-red-500 pl-11 pr-4 text-[15px] font-bold text-slate-800 transition-all placeholder:font-medium placeholder:text-slate-400"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
              </svg>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !formData.name || !formData.phone}
            className={cn(
              "w-full mt-6 h-14 flex items-center justify-center rounded-[20px] text-[15px] font-black uppercase tracking-wider transition-all",
              !(loading || !formData.name || !formData.phone) && "bg-gradient-to-r from-[#FF6B35] to-[#FF2D55] shadow-xl shadow-[rgba(255,107,53,0.35)]",
              loading || !formData.name || !formData.phone 
                ? "bg-[#E8E4DE] text-[#B0B0BF] cursor-not-allowed" 
                : "text-white active:scale-[0.98]"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">Yuklanmoqda... <RefreshCcw size={18} className="animate-spin" /></span>
            ) : "Yaratish"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompanyCreatePage;
