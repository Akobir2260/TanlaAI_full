import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { Category } from '../types';

interface Props {
  categories: Category[];
}

/* Bold pill-style horizontal category strip */
const CategoryGrid: React.FC<Props> = ({ categories }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentCategory = searchParams.get('category');

  const allActive = !currentCategory && location.pathname === '/';

  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 snap-x">
      {/* "All" pill */}
      <NavLink
        to="/search"
        className="flex-shrink-0 snap-start px-5 py-2.5 rounded-full text-[13px] font-black whitespace-nowrap transition-all active:scale-95"
        style={allActive
          ? { background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', color: '#fff', boxShadow: '0 4px 14px rgba(255,107,53,0.30)' }
          : { background: '#fff', color: '#8A8A99', border: '1.5px solid rgba(26,26,46,0.08)' }
        }
      >
        Barchasi
      </NavLink>

      {categories.map((cat) => {
        const isActive = currentCategory === String(cat.id);
        return (
          <NavLink
            key={cat.id}
            to={`/search?category=${cat.id}`}
            className="flex-shrink-0 snap-start px-5 py-2.5 rounded-full text-[13px] font-black whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5"
            style={isActive
              ? { background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', color: '#fff', boxShadow: '0 4px 14px rgba(255,107,53,0.30)' }
              : { background: '#fff', color: '#8A8A99', border: '1.5px solid rgba(26,26,46,0.08)' }
            }
          >
            {cat.name}
          </NavLink>
        );
      })}
    </div>
  );
};

export default CategoryGrid;
