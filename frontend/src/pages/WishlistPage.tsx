import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Sparkles } from 'lucide-react';
import apiClient from '../api/client';
import type { AIResult, ApiListResponse, Product, WishlistItem } from '../types';
import ProductCard from '../components/ProductCard';
import { useTelegram } from '../contexts/useTelegram';

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [aiResults, setAiResults] = useState<AIResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wishlistRes, aiResultsRes] = await Promise.all([
          apiClient.get<ApiListResponse<WishlistItem> | WishlistItem[]>('/wishlist/'),
          apiClient.get<ApiListResponse<AIResult> | AIResult[]>('/ai-results/'),
        ]);

        const wishlistItems = Array.isArray(wishlistRes.data) ? wishlistRes.data : wishlistRes.data.results;
        const aiItems = Array.isArray(aiResultsRes.data) ? aiResultsRes.data : aiResultsRes.data.results;

        setWishlist(wishlistItems.map((item) => item.product_details));
        setAiResults(aiItems);
      } catch (error) {
        console.error('Error fetching wishlist page data:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const handleToggleWishlist = async (productId: number) => {
    try {
      await apiClient.post(`/products/${productId}/toggle_wishlist/`);
      setWishlist((prev) => prev.filter((product) => product.id !== productId));
      haptic('soft');
    } catch (error) {
      console.error('Error removing wishlist item:', error);
    }
  };

  return (
    <div className="p-6 pb-24 space-y-8">
      <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
        <ArrowLeft size={18} />
      </button>

      <section className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Heart size={16} className="fill-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest">Your Collection</p>
        </div>
        <h1 className="text-2xl font-black text-on-surface">Saqlanganlar va AI natijalari</h1>
        <p className="text-sm text-outline">Tanlagan mahsulotlaringiz va yaratilgan vizualizatsiyalar shu yerda.</p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Heart size={16} className="fill-error text-error" />
          <h2 className="text-sm font-black uppercase tracking-widest text-outline">Saved Products</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="aspect-[3/4] rounded-3xl bg-surface-variant animate-pulse" />
            ))}
          </div>
        ) : wishlist.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {wishlist.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={true}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[28px] p-8 text-center border border-dashed border-outline/10 text-outline">
            Saqlangan mahsulotlar hozircha yo'q.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest text-outline">Generated Visualizations</h2>
        </div>

        {aiResults.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {aiResults.map((result) => (
              <a
                key={result.id}
                href={result.image}
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-square overflow-hidden rounded-3xl border border-outline/10 bg-white"
              >
                <img src={result.image} alt={result.product_details?.name || 'AI Result'} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-xs font-bold text-white truncate">{result.product_details?.name || 'Visualization'}</p>
                  <p className="text-[10px] text-white/70">{new Date(result.created_at).toLocaleDateString()}</p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[28px] p-8 text-center border border-dashed border-outline/10 text-outline">
            Hozircha AI natijalari yo'q.
          </div>
        )}
      </section>
    </div>
  );
};

export default WishlistPage;
