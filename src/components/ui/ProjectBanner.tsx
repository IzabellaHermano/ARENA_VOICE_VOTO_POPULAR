import React from 'react';
import { Layers } from 'lucide-react';

export interface ProjectBannerProps {
  title: string;
  category?: string;
  bannerUrl?: string;
  className?: string;
}

export const ProjectBanner: React.FC<ProjectBannerProps> = ({
  title,
  category,
  bannerUrl,
  className = '',
}) => {
  return (
    <div
      className={`w-full bg-arena-card border border-arena-border rounded-2xl overflow-hidden shadow-lg transition-all ${className}`}
    >
      {/* Banner image or placeholder */}
      <div className="relative h-28 sm:h-32 w-full bg-gradient-to-br from-[#0c182d] via-[#101b30] to-[#070d18] flex items-center justify-center overflow-hidden border-b border-arena-border/60">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 gap-1.5 select-none">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-arena-blue shadow-blue-glow">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Banner do Projeto
            </span>
          </div>
        )}

        {/* Ambient lighting inside banner */}
        <div className="absolute inset-0 bg-gradient-to-t from-arena-card via-transparent to-transparent opacity-80" />
      </div>

      {/* Project Info */}
      <div className="p-3 text-center">
        <h3 className="text-lg sm:text-xl font-black text-white tracking-wide">
          {title}
        </h3>
        {category && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
            {category}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProjectBanner;

