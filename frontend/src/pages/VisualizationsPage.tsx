import React, { useEffect, useState, useCallback } from 'react';
import { 
  Sparkles, Trash2, ShoppingCart, 
  ChevronLeft, Clock, 
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../api/client';
import { useTelegram } from '../contexts/useTelegram';
import type { AIResult, ApiListResponse } from '../types';
import { cn } from '../utils/cn';

const MEDIA_BASE = import.meta.env.VITE_BACKEND_ORIGIN || '';

const VisualizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [results, setResults] = useState<AIResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [conversionLoading, setConversionLoading] = useState<number | null>(null);

  const fetchResults = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const url = isLoadMore && nextUrl ? nextUrl : '/ai-results/';
      const { data } = await apiClient.get<ApiListResponse<AIResult> | AIResult[]>(url);
      
      const newResults = Array.isArray(data) ? data : data.results;
      const next = Array.isArray(data) ? null : data.next;

      setResults(prev => isLoadMore ? [...prev, ...newResults] : newResults);
      setNextUrl(next);
    } catch (err) {
      console.error('Error fetching AI results:', err);
    } finally {
      if (isLoadMore) setLoadingMore(false);
      else setLoading(false);
    }
  }, [nextUrl]);

  useEffect(() => {
    fetchResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Ushbu vizualizatsiyani o'chirmoqchimisiz?")) return;
    haptic('medium');
    try {
      await apiClient.delete(`/ai-results/${id}/`);
      setResults(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting result:', err);
    }
  };

  const handleConvertToLead = async (id: number) => {
    haptic('medium');
    setConversionLoading(id);
    try {
      await apiClient.post(`/ai-results/${id}/convert-to-lead/`);
      alert("So'rovingiz qabul qilindi! Tezgunda mutaxassislarimiz bog'lanishadi.");
    } catch (err) {
      console.error('Error converting to lead:', err);
    } finally {
      setConversionLoading(null);
    }
  };

  const getFullImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { haptic('light'); navigate(-1); }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronLeft size={24} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-800 leading-none">Mening kutubxonam</h1>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-none">SI Vizualizatsiyalar</span>
            </div>
          </div>
          <div className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
             <span className="text-xs font-black text-indigo-600 tracking-tight">{results.length} ta natija</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-[3/4] bg-white rounded-3xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence>
              {results.map((result, idx) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200/50 shadow-sm hover:shadow-md transition-all group"
                >
                  {/* Image Container */}
                  <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                    <img 
                      src={getFullImageUrl(result.image)} 
                      alt={result.product_details?.name || 'Result'} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onClick={() => { haptic('light'); setSelectedImage(getFullImageUrl(result.image)); }}
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      <button 
                        onClick={() => handleDelete(result.id)}
                        className="p-2 bg-white/90 backdrop-blur shadow-sm text-slate-400 hover:text-rose-500 rounded-full transition-all active:scale-90"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {/* Status Badge */}
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/40 backdrop-blur rounded-lg flex items-center gap-1.5 border border-white/20">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full animate-pulse",
                        result.status === 'done' ? "bg-emerald-400" : "bg-amber-400"
                      )} />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                        {result.status === 'done' ? 'Tayyor' : 'Kutilmoqda'}
                      </span>
                    </div>
                  </div>

                  {/* Info & Actions */}
                  <div className="p-3 space-y-3">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-black text-slate-800 truncate line-clamp-1">
                        {result.product_details?.name || 'Noma\'lum mahsulot'}
                      </h3>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                        <Clock size={10} />
                        {new Date(result.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleConvertToLead(result.id)}
                      disabled={conversionLoading === result.id}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                    >
                      {conversionLoading === result.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart size={14} />
                          <span className="text-[11px] font-black uppercase tracking-wider">Buyurtma</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-20 text-center space-y-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto border border-slate-100 shadow-sm">
                <Sparkles size={32} className="text-slate-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">Kutubxonangiz bo'sh</h3>
              <p className="text-slate-500 text-sm font-medium px-10">AI vizualizatsiyalar qiling va ular shu yerda saqlanadi.</p>
            </div>
            <button 
              onClick={() => { haptic('light'); navigate('/'); }}
              className="px-8 py-3 bg-white border border-slate-200 text-slate-800 rounded-2xl font-black text-sm hover:bg-slate-50 active:scale-95 transition-all"
            >
              Katalogni ko'rish
            </button>
          </div>
        )}

        {/* Load More */}
        {nextUrl && (
          <div className="mt-10 flex justify-center pb-10">
            <button 
              onClick={() => fetchResults(true)}
              disabled={loadingMore}
              className="flex items-center gap-2 px-10 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
            >
              {loadingMore ? <Loader2 size={16} className="animate-spin" /> : 'Yana yuklash'}
            </button>
          </div>
        )}
      </main>

      {/* Image Modal Preview */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setSelectedImage(null)}
          >
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage} 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
            <button className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm border border-white/20 transition-all active:scale-95">
              Yopish
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VisualizationsPage;
