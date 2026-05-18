import { useEffect, useState, useCallback } from 'react';
import { Eye, Clock, User, Package, ExternalLink } from 'lucide-react';
import apiClient from '../../api/client';
import ImageSlider from '../../components/ImageSlider';

type AIResult = {
  id: number;
  user_name: string;
  product_name: string;
  input_image: string | null;
  image: string;
  status: string;
  created_at: string;
};

const MEDIA_BASE = import.meta.env.VITE_BACKEND_ORIGIN || '';

export default function AdminAIResultsPage() {
  const [results, setResults] = useState<AIResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchResults = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const url = isLoadMore && nextUrl ? nextUrl : 'admin/ai-results/';
      const { data } = await apiClient.get(url);
      
      const newResults = data.results ?? data;
      setResults(prev => isLoadMore ? [...prev, ...newResults] : newResults);
      setNextUrl(data.next || null);
      if (data.count !== undefined) setTotalCount(data.count);
      else if (!isLoadMore) setTotalCount(newResults.length);
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
  }, []); // Initial load only

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AI Visualization Logs</h1>
          <p className="text-sm text-slate-500">History of all AI transformations across the platform</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold">
          <Eye size={18} /> {totalCount || results.length} Generations
        </div>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
          <Eye size={48} className="mx-auto text-slate-100 mb-3" />
          <p className="text-slate-500">Hali AI generatsiyalari yo{"'"}q</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {results.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-all"
            >
              {/* Image Comparison / Main Result */}
              <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                {r.input_image ? (
                  <ImageSlider 
                    before={r.input_image.startsWith('http') ? r.input_image : `${MEDIA_BASE}${r.input_image}`}
                    after={r.image.startsWith('http') ? r.image : `${MEDIA_BASE}${r.image}`}
                    beforeLabel="Eski"
                    afterLabel="Yangi"
                    aspectRatio="aspect-square sm:aspect-[4/3]"
                  />
                ) : (
                  <img
                    src={r.image.startsWith('http') ? r.image : `${MEDIA_BASE}${r.image}`}
                    alt={r.product_name}
                    className="w-full h-full object-contain"
                  />
                )}
                
                {/* User/Product Float Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-40 pointer-events-none">
                   <div className="flex items-center gap-2 text-white">
                      <Package size={14} className="text-sky-400" />
                      <span className="text-xs font-bold truncate">{r.product_name}</span>
                   </div>
                </div>
              </div>

              {/* Info Area */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <User size={14} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{r.user_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                    <Clock size={12} />
                    {new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <a
                    href={r.image.startsWith('http') ? r.image : `${MEDIA_BASE}${r.image}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
                  >
                    <ExternalLink size={14} /> View Full Image
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {nextUrl && (
        <div className="flex justify-center pt-8 pb-12">
          <button
            onClick={() => fetchResults(true)}
            disabled={loadingMore}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-8 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            {loadingMore ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              'Yana yuklash'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
