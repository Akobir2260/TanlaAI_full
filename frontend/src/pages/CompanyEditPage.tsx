import React, { useEffect, useState, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  MessageCircle, 
  Save, 
  X, 
  Camera,
  Share2 as Instagram,
  Phone,
  Play,
  AlertCircle,
} from 'lucide-react';
import apiClient from '../api/client';
import type { Company } from '../types';
import { useTelegram } from '../contexts/useTelegram';

interface CompanyFormData extends Partial<Company> {
  logo_file?: File;
}

const emptyCompanyForm: CompanyFormData = {
  name: '',
  description: '',
  phone: '+998',
  location: '',
  telegram_link: '',
  instagram_link: '',
  youtube_link: '',
};

const normalizeCompany = (company: Company): CompanyFormData => ({
  name: company.name ?? '',
  description: company.description ?? '',
  phone: company.phone ?? '',
  location: company.location ?? '',
  telegram_link: company.telegram_link ?? '',
  instagram_link: company.instagram_link ?? '',
  youtube_link: company.youtube_link ?? '',
});

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!isAxiosError<Record<string, unknown>>(error)) {
    return fallback;
  }

  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') {
    return detail;
  }

  const firstFieldError = Object.values(error.response?.data ?? {}).find((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return typeof value === 'string';
  });

  if (Array.isArray(firstFieldError)) {
    return String(firstFieldError[0]);
  }

  if (typeof firstFieldError === 'string') {
    return firstFieldError;
  }

  return fallback;
};

// Validation helpers
const isValidPhone = (phone: string) => /^\+998\d{9}$/.test(phone.replace(/\s/g, ''));
const isValidUrl = (url: string) => {
  if (!url) return true; // empty is ok for optional
  try { new URL(url); return true; } catch { return false; }
};

const CompanyEditPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { haptic, refreshProfile } = useTelegram();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [companyExists, setCompanyExists] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CompanyFormData>(emptyCompanyForm);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await apiClient.get('companies/my/');
        setFormData(normalizeCompany(response.data));
        setPreview(response.data.logo ?? null);
        setCompanyExists(true);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setCompanyExists(false);
          setFormData(emptyCompanyForm);
        } else {
          console.error('Error fetching company:', err);
          setErrorMessage(getErrorMessage(err, "Studiya ma'lumotlarini yuklashda xatolik yuz berdi."));
        }
      } finally {
        setLoading(false);
      }
    };
    void fetchCompany();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      let val = value;
      if (!val.startsWith('+998')) val = '+998';
      const digits = val.slice(4).replace(/\D/g, '').slice(0, 9);
      setFormData(prev => ({ ...prev, phone: '+998' + digits }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, logo_file: file }));
      setPreview(URL.createObjectURL(file));
      haptic('light');
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name?.trim()) errors.name = "Brend nomini kiriting";
    if (!formData.location?.trim()) errors.location = "Manzilni kiriting";
    
    if (!formData.phone?.trim()) {
      errors.phone = "Telefon raqam majburiy";
    } else if (!isValidPhone(formData.phone)) {
      errors.phone = "Format: +998XXXXXXXXX";
    }
    
    if (!formData.telegram_link?.trim()) {
      errors.telegram_link = "Telegram link majburiy";
    }
    
    if (!formData.instagram_link?.trim()) {
      errors.instagram_link = "Instagram link majburiy";
    }
    
    if (formData.youtube_link?.trim() && !isValidUrl(formData.youtube_link) && !formData.youtube_link.includes('youtube.com') && !formData.youtube_link.includes('youtu.be')) {
      errors.youtube_link = "YouTube link noto'g'ri";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    haptic('medium');
    
    if (!validate()) {
      haptic('heavy');
      return;
    }
    
    setSubmitting(true);
    setErrorMessage(null);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'logo_file' && value instanceof File) {
        data.append('logo', value);
      } else if (key === 'logo_file' || key === 'logo') {
        // Skip
      } else if (value !== null && value !== undefined) {
        let finalValue = value.toString();
        
        // Auto-prepend @ for usernames if not a link and doesn't start with @
        if (key === 'telegram_link' || key === 'instagram_link') {
          const trimmed = finalValue.trim();
          if (trimmed && !trimmed.startsWith('@') && !trimmed.startsWith('http')) {
            finalValue = '@' + trimmed;
          }
        }
        
        data.append(key, finalValue);
      }
    });

    try {
      const request = companyExists
        ? apiClient.patch('companies/my/', data)
        : apiClient.post('companies/my/', data);

      await request;
      await refreshProfile();
      setCompanyExists(true);
      haptic('heavy');
      navigate('/creator');
    } catch (err) {
      console.error('Error saving company:', err);
      setErrorMessage(getErrorMessage(err, "Studiya profilini saqlashning imkoni bo'lmadi."));
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Studiya ma'lumotlari yuklanmoqda...</div>;

  const renderField = (
    name: string,
    label: string,
    hint: string,
    icon: React.ReactNode,
    placeholder: string,
    required: boolean = true,
    type: string = 'text'
  ) => (
    <div className="relative">
      <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1 mb-1.5 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <p className="text-[11px] text-slate-400 ml-1 mb-2">{hint}</p>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2">{icon}</div>
        <input
          name={name}
          type={type}
          value={String((formData as Record<string, unknown>)[name] ?? '')}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-white border rounded-2xl py-4 pl-14 pr-5 text-on-surface font-bold outline-none focus:ring-2 transition-all ${
            fieldErrors[name]
              ? 'border-red-300 focus:ring-red-100'
              : 'border-outline/5 focus:ring-primary/10'
          }`}
        />
      </div>
      {fieldErrors[name] && (
        <p className="flex items-center gap-1.5 text-red-500 text-xs font-semibold mt-1.5 ml-1">
          <AlertCircle size={12} /> {fieldErrors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="p-6 pb-24 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-on-surface">Studiya profili</h2>
        <button onClick={() => navigate(-1)} className="text-outline">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {errorMessage && (
          <div className="rounded-2xl border border-error/20 bg-error/10 px-5 py-4 text-sm font-bold text-error">
            {errorMessage}
          </div>
        )}

        {/* Logo */}
        <div className="flex flex-col items-center">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-32 h-32 bg-surface-variant rounded-[40px] border-2 border-dashed border-outline/10 overflow-hidden relative cursor-pointer active:scale-95 transition-all shadow-xl shadow-black/5"
          >
            {preview ? (
              <img src={preview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-outline/30">
                <Building2 size={32} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-outline mt-4">Studiya identifikatsiyasi</p>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>

        {/* Asosiy ma'lumotlar */}
        <div className="space-y-5">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-outline ml-1 flex items-center gap-2">
            <Building2 size={14} className="text-primary" /> Asosiy ma'lumotlar
          </h4>
          
          {renderField(
            'name', 'Brend nomi', "Kompaniya yoki do'kon nomi",
            <Building2 className="text-primary" size={20} />,
            'Artisan Studio'
          )}
          
          {renderField(
            'phone', 'Telefon raqam', 'Mijozlar siz bilan bog\'lanadi',
            <Phone className="text-green-500" size={20} />,
            '+998901234567',
            true, 'tel'
          )}
          
          {renderField(
            'location', 'Manzil', 'Google Maps link yoki matnli manzil',
            <MapPin className="text-primary" size={20} />,
            'Toshkent, Chilonzor tumani, 7-mavze'
          )}
          
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1 mb-1.5 block">Faoliyatimiz haqida</label>
            <p className="text-[11px] text-slate-400 ml-1 mb-2">Mijozlarga sizning noyob yondashuvingiz haqida aytib bering</p>
            <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Biz premium eshiklar ishlab chiqaramiz..." className="w-full bg-white border border-outline/5 rounded-2xl py-4 px-5 text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
          </div>
        </div>

        {/* Ijtimoiy tarmoqlar */}
        <div className="space-y-5">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-outline ml-1 flex items-center gap-2">
            <MessageCircle size={14} className="text-[#229ED9]" /> Ijtimoiy tarmoqlar
          </h4>
          
          {renderField(
            'telegram_link', 'Telegram', 'Kanal yoki shaxsiy profil',
            <MessageCircle className="text-[#229ED9]" size={20} />,
            'https://t.me/username'
          )}
          
          {renderField(
            'instagram_link', 'Instagram', 'Biznes profil',
            <Instagram className="text-[#E4405F]" size={20} />,
            'https://instagram.com/username'
          )}
          
          {renderField(
            'youtube_link', 'YouTube', 'Agar mavjud bo\'lsa (ixtiyoriy)',
            <Play className="text-[#FF0000]" size={20} />,
            'https://youtube.com/@channel',
            false
          )}
        </div>

        <button type="submit" disabled={submitting} className="w-full main-button-gradient text-white font-black py-5 rounded-[28px] shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50">
          {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={20} /><span className="text-lg uppercase tracking-widest">{companyExists ? 'Profilni yangilash' : 'Profilni yaratish'}</span></>}
        </button>
      </form>
    </div>
  );
};

export default CompanyEditPage;
