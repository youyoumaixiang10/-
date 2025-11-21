import React from 'react';
import { Master } from '../types';

interface MasterCardProps {
  master: Master;
  isSelected: boolean;
  isRecommended?: boolean;
  onToggle: (id: string) => void;
  disabled: boolean;
}

export const MasterCard: React.FC<MasterCardProps> = ({ 
  master, 
  isSelected, 
  isRecommended, 
  onToggle,
  disabled 
}) => {
  return (
    <div 
      onClick={() => {
        if (!disabled || isSelected) onToggle(master.id);
      }}
      className={`
        relative p-4 rounded-xl border cursor-pointer transition-all duration-300 group overflow-hidden
        ${isSelected 
          ? 'bg-slate-800/80 border-amber-700/50 shadow-[0_0_20px_rgba(180,83,9,0.1)]' 
          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
        }
        ${disabled && !isSelected ? 'opacity-40 cursor-not-allowed grayscale' : ''}
      `}
    >
      {/* Selection Glow Background - subtler */}
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-transparent pointer-events-none" />
      )}

      {isRecommended && (
        <div className="absolute -top-2 -right-2 bg-amber-800 text-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-10 uppercase tracking-wide border border-amber-500/30">
          系统推荐
        </div>
      )}
      
      <div className="flex items-start space-x-4 relative z-0">
        <div className={`
          flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-inner ring-2 ring-black/20
          ${master.color}
        `}>
          {master.avatarInitials}
        </div>
        <div className="flex-1">
          <h3 className={`font-heading font-bold text-lg leading-none mb-1 transition-colors ${isSelected ? 'text-amber-100' : 'text-slate-300'}`}>
            {master.name}
          </h3>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{master.title}</p>
          <p className="text-sm text-slate-400 font-light leading-relaxed line-clamp-2">
            {master.description}
          </p>
        </div>
        
        <div className={`
          w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 mt-1
          ${isSelected 
            ? 'bg-gradient-to-b from-amber-600 to-amber-800 border-amber-600 shadow-md' 
            : 'border-slate-700 bg-slate-900/50 group-hover:border-slate-500'
          }
        `}>
          {isSelected && (
            <svg className="w-3 h-3 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};