import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Star, ArrowUpRight, Search } from 'lucide-react';
import apiClient from '../api/client';
import { getMediaUrl } from '../utils/media';
import type { ApiListResponse, Company } from '../types';
import { useTelegram } from '../contexts/useTelegram';
import { cn } from '../utils/cn';

interface LeaderboardCompany extends Company {
  converted_leads?: number;
  total_leads?: number;
  ai_usage?: number;
}

const CompanyListPage: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<LeaderboardCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const { haptic } = useTelegram();

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      try {
        if (query.trim()) {
           const suffix = `?search=${encodeURIComponent(query.trim())}`;
           const response = await apiClient.get<ApiListResponse<LeaderboardCompany> | LeaderboardCompany[]>(`/companies/${suffix}`);
           setCompanies(Array.isArray(response.data) ? response.data : response.data.results);
        } else {
           const response = await apiClient.get<LeaderboardCompany[]>(`/companies/leaderboard/`);
           setCompanies(response.data);
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void fetchCompanies();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="p-6 pb-24 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
          <Building size={32} />
        </div>
        <h2 className="text-2xl font-extrabold text-on-surface">Kampaniyalar</h2>
        <p className="text-xs text-outline font-medium">Barcha studiyalar va do'konlar katalogi.</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Studiyalarni qidiring..."
          className="w-full rounded-2xl bg-white border border-outline/10 py-4 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-surface-variant animate-pulse rounded-2xl" />
          ))
        ) : companies.length > 0 ? (
          companies.map((company, index) => (
            <button
              key={company.id}
              type="button"
              className="w-full group bg-white p-5 rounded-3xl border border-outline/5 shadow-sm active:scale-[0.98] transition-all flex items-center gap-4 text-left"
              onClick={() => {
                haptic('light');
                navigate(`/company/${company.id}`);
              }}
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl border border-outline/10 overflow-hidden bg-surface-variant">
                  {company.logo ? (
                    <img src={getMediaUrl(company.logo)} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline/30">
                      <Star size={24} />
                    </div>
                  )}
                </div>
                <div className={cn(
                  "absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg",
                  index === 0 ? "bg-yellow-400 text-yellow-900" : 
                  index === 1 ? "bg-slate-300 text-slate-700" :
                  index === 2 ? "bg-orange-300 text-orange-900" : "bg-white text-outline"
                )}>
                  {index + 1}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-on-surface truncate">{company.name}</h4>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="text-emerald-500">{company.converted_leads || 0} sotuv</span>
                    <span className="w-1 h-1 bg-outline/20 rounded-full" />
                    <span className="text-outline">{company.total_leads || 0} ta lead</span>
                    <span className="w-1 h-1 bg-outline/20 rounded-full" />
                    <span className="text-sky-500">{company.ai_usage || 0} visual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-outline truncate max-w-[120px]">{company.location}</span>
                    <span className="w-1 h-1 bg-outline/20 rounded-full" />
                    {company.is_vip ? (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Hamkor</span>
                    ) : (
                      <span className="text-[10px] font-bold text-primary">Tasdiqlangan do'kon</span>
                    )}
                  </div>
                </div>
              </div>

              <span className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                <ArrowUpRight size={20} />
              </span>
            </button>
          ))
        ) : (
          <div className="rounded-[28px] border border-dashed border-outline/10 bg-white p-10 text-center text-outline">
            Hozircha mos studiya topilmadi.
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyListPage;
