import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import type { Banner } from '../types';

interface Props {
  banners: Banner[];
}

const BannerCarousel: React.FC<Props> = ({ banners }) => {
  return (
    <div
      className="w-full overflow-hidden"
      style={{
        borderRadius: '22px',
        height: '190px',
        boxShadow: '0 8px 32px rgba(26,26,46,0.10)',
      }}
    >
      <style>{`
        .banner-swiper .swiper-pagination-bullet {
          background: rgba(255,255,255,0.5);
          width: 6px; height: 6px;
          transition: all 0.3s;
        }
        .banner-swiper .swiper-pagination-bullet-active {
          background: #fff;
          width: 20px;
          border-radius: 3px;
        }
      `}</style>
      <Swiper
        modules={[Autoplay, Pagination]}
        spaceBetween={0}
        slidesPerView={1}
        pagination={{ clickable: true }}
        autoplay={{ delay: 3500, disableOnInteraction: false }}
        className="h-full banner-swiper"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div className="relative w-full h-full">
              <img
                src={banner.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23FF6B35'/%3E%3C/svg%3E"}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
              {/* Multi-layer gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, rgba(26,26,46,0.80) 0%, rgba(26,26,46,0.20) 55%, transparent 100%)',
                }}
              />
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                {banner.title && (
                  <h3 className="text-white text-[17px] font-black leading-tight mb-0.5">
                    {banner.title}
                  </h3>
                )}
                {banner.subtitle && (
                  <p className="text-white/70 text-[12px] font-medium">{banner.subtitle}</p>
                )}
              </div>
              {/* Corner accent */}
              <div
                className="absolute top-3 right-3 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,107,53,0.90)', backdropFilter: 'blur(6px)' }}
              >
                Yangi
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default BannerCarousel;
