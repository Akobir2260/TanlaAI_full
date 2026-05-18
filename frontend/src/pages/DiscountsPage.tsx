import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Percent, Sparkles, Search } from 'lucide-react';
import apiClient from '../api/client';
import type { ApiListResponse, Company, Product } from '../types';
import { useTelegram } from '../contexts/useTelegram';
import ProductCard from '../components/ProductCard';
import { cn } from '../utils/cn';

const DiscountsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const { haptic } = useTelegram();
  const selectedCompany = searchParams.get('company');

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await apiClient.get<ApiListResponse<Company> | Company[]>('companies/');
        setCompanies(Array.isArray(response.data) ? response.data : response.data.results);
      } catch (error) {
        console.error('Error fetching companies:', error);
      }
    };

    void fetchCompanies();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentQuery = searchParams.get('q') || '';
      const nextQuery = searchTerm.trim();

      if (currentQuery === nextQuery) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams);
      if (nextQuery) {
        nextParams.set('q', nextQuery);
      } else {
        nextParams.delete('q');
      }
      setSearchParams(nextParams, { replace: true });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchParams, searchTerm, setSearchParams]);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('is_on_sale', 'true');

        const query = searchParams.get('q');
        const company = searchParams.get('company');
        if (query) {
          params.set('search', query);
        }
        if (company) {
          params.set('company', company);
        }

        const response = await apiClient.get<ApiListResponse<Product> | Product[]>(`products/?${params.toString()}`);
        setProducts(Array.isArray(response.data) ? response.data : response.data.results);
      } catch (error) {
        console.error('Error fetching discounted products:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchSales();
  }, [searchParams]);

  const handleCompanySelect = (companyId?: number) => {
    const nextParams = new URLSearchParams(searchParams);
    if (companyId) {
      nextParams.set('company', String(companyId));
    } else {
      nextParams.delete('company');
    }
    setSearchParams(nextParams);
    haptic('light');
  };

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-8">
      <div className="bg-error/5 p-8 rounded-[40px] text-center space-y-3 relative overflow-hidden border border-error/10">
        <div className="absolute top-0 right-0 p-4 text-error/10">
          <Percent size={80} />
        </div>
        <div className="w-16 h-16 bg-error rounded-full flex items-center justify-center mx-auto text-white shadow-lg shadow-error/20">
          <Sparkles size={32} />
        </div>
        <h2 className="text-2xl font-black text-on-surface">Maxsus takliflar</h2>
        <p className="text-[10px] text-error font-black uppercase tracking-[0.2em]">Qo'l mehnati mahsulotlariga 40% gacha chegirma</p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Aksiyadagi mahsulotlarni qidiring..."
            className="w-full rounded-2xl bg-white border border-outline/10 py-4 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-error/10"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => handleCompanySelect()}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-all",
              !selectedCompany ? "border-error bg-error text-white shadow-md shadow-error/20" : "border-outline/10 bg-white text-outline"
            )}
          >
            Barcha studiyalar
          </button>
          {companies.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => handleCompanySelect(company.id)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-all",
                selectedCompany === String(company.id) ? "border-error bg-error text-white shadow-md shadow-error/20" : "border-outline/10 bg-white text-outline"
              )}
            >
              {company.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] bg-surface-variant animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onToggleWishlist={async (id) => {
                try {
                  await apiClient.post(`products/${id}/toggle_wishlist/`);
                  setProducts(prev => prev.map(p => p.id === id ? { ...p, is_wishlisted: !p.is_wishlisted } : p));
                } catch (e) {
                  console.error(e);
                }
              }} 
              isWishlisted={product.is_wishlisted}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-outline">
          <Percent size={48} className="mx-auto mb-4 opacity-10" />
          <p className="text-sm font-medium">Ayni vaqtda faol aksiyalar mavjud emas.</p>
        </div>
      )}
    </div>
  );
};

export default DiscountsPage;
