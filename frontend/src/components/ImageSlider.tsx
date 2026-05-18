import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageSliderProps {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  aspectRatio?: string;
}

const ImageSlider: React.FC<ImageSliderProps> = ({ 
  before, 
  after, 
  beforeLabel = 'Oldin', 
  afterLabel = 'Keyin',
  className = '',
  aspectRatio = 'aspect-[4/3]'
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = (x: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(Math.max(pos, 0), 100));
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) handleMove(e.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const onStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    handleMove(x);
  };

  const onEnd = () => {
    isDragging.current = false;
  };

  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', onEnd);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => {
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('resize', updateWidth);
    };
  }, [updateWidth]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none group cursor-ew-resize rounded-2xl ${aspectRatio} ${className}`}
      onMouseDown={onStart}
      onMouseMove={onMouseMove}
      onTouchStart={onStart}
      onTouchMove={onTouchMove}
    >
      {/* Target Image (After) */}
      <img 
        src={after} 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
        alt="After" 
      />
      
      {/* Source Image (Before) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ width: `${sliderPos}%` }}
      >
        <img 
          src={before} 
          className="absolute inset-0 h-full object-cover max-w-none pointer-events-none" 
          style={{ width: containerWidth }}
          alt="Before" 
        />
      </div>
      
      {/* Slider Line & Handle */}
      <div 
        className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-2xl border-2 border-white/50 transition-transform group-hover:scale-110">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3 bg-slate-300 rounded-full" />
            <div className="w-0.5 h-3 bg-slate-300 rounded-full" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-widest z-30 transition-opacity group-hover:opacity-100 opacity-60">
        {beforeLabel}
      </div>
      <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-widest z-30 transition-opacity group-hover:opacity-100 opacity-60">
        {afterLabel}
      </div>
    </div>
  );
};

export default ImageSlider;
