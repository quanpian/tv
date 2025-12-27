
import React, { useState } from 'react';
import { VodDetail } from '../types';
import ImageWithFallback from './ImageWithFallback';

interface MovieInfoCardProps {
  movie: VodDetail;
  onSearch?: (keyword: string) => void;
}

const MovieInfoCard: React.FC<MovieInfoCardProps> = ({ movie, onSearch }) => {
  const [expanded, setExpanded] = useState(false);
  const score = movie.vod_score || movie.vod_douban_score || 'N/A';
  const rawContent = movie.vod_content ? movie.vod_content.replace(/<[^>]+>/g, '') : '暂无简介';
  const isLongContent = rawContent.length > 200;
  const displayContent = expanded ? rawContent : rawContent.slice(0, 200) + (isLongContent ? '...' : '');

  const MetaItem = ({ label, value, fullWidth = false }: { label: string, value?: string, fullWidth?: boolean }) => {
      if (!value) return null;
      return (
          <div className={`flex flex-col gap-1.5 ${fullWidth ? 'col-span-2' : ''}`}>
              <span className="text-gray-500 text-[10px] md:text-xs font-black uppercase tracking-widest">{label}</span>
              <span className="text-gray-200 text-xs md:text-sm font-bold leading-relaxed">{value}</span>
          </div>
      );
  };

  return (
      <article className="relative w-full rounded-[2rem] md:rounded-[2.5rem] overflow-hidden bg-[#0a0a0a] border border-white/5 shadow-2xl mt-8 font-sans mb-12 ring-1 ring-white/10">
          <div className="absolute inset-0 z-0">
              <ImageWithFallback src={movie.vod_pic || ''} searchKeyword={movie.vod_name} className="w-full h-full object-cover opacity-15 blur-[100px] scale-125" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/40 via-[#0a0a0a] to-[#0a0a0a]"></div>
          </div>

          <div className="relative z-10 p-6 md:p-12 flex flex-col gap-8 md:gap-12">
              <header className="flex flex-col md:flex-row gap-10 md:gap-16 items-start">
                  <div className="flex-shrink-0 mx-auto md:mx-0">
                      <div className="w-[140px] h-[210px] md:w-[200px] md:h-[300px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900 transition-transform hover:scale-105 duration-500">
                          <ImageWithFallback src={movie.vod_pic || ''} searchKeyword={movie.vod_name} priority={true} className="w-full h-full object-cover" />
                      </div>
                  </div>

                  <div className="flex-1 text-gray-200">
                      <h1 className="text-3xl md:text-5xl font-black text-white mb-6 flex items-center gap-4 flex-wrap tracking-tight">
                          {movie.vod_name}
                          {movie.vod_remarks && (
                              <span className="text-[10px] md:text-xs font-black px-3 py-1 rounded-full border border-[#22c55e]/30 text-[#22c55e] bg-[#22c55e]/10 tracking-widest uppercase">
                                  {movie.vod_remarks}
                              </span>
                          )}
                      </h1>

                      <div className="flex flex-wrap gap-2 mb-8">
                          {movie.vod_area && <span className="bg-white/5 border border-white/10 text-white text-[10px] font-black px-4 py-1.5 rounded-full">{movie.vod_area}</span>}
                          {movie.vod_year && <span className="bg-white/5 border border-white/10 text-white text-[10px] font-black px-4 py-1.5 rounded-full">{movie.vod_year}</span>}
                          {score !== 'N/A' && <span className="bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-[10px] font-black px-4 py-1.5 rounded-full">★ {score}</span>}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 bg-white/[0.02] p-6 md:p-8 rounded-3xl border border-white/5">
                          <MetaItem label="导演" value={movie.vod_director} />
                          <MetaItem label="主演" value={movie.vod_actor} fullWidth />
                          <MetaItem label="类型" value={movie.type_name} />
                          <MetaItem label="语言" value={movie.vod_lang} />
                      </div>

                      <div className="text-sm md:text-lg leading-relaxed text-gray-400 font-medium">
                          <h2 className="text-white font-black mb-4 text-base md:text-xl tracking-tight uppercase">剧情蓝图 / SYNOPSIS</h2>
                          <p className={`whitespace-pre-line ${expanded ? '' : 'line-clamp-4'}`}>
                              {displayContent}
                          </p>
                          {isLongContent && (
                              <button onClick={() => setExpanded(!expanded)} className="text-[#22c55e] hover:text-[#4ade80] text-xs mt-6 font-black tracking-widest uppercase transition-all flex items-center gap-2">
                                  {expanded ? '收起详情' : '展开更多'}
                              </button>
                          )}
                      </div>
                  </div>
              </header>

              {movie.vod_recs && movie.vod_recs.length > 0 && (
                  <section className="border-t border-white/10 pt-10">
                      <h3 className="text-lg md:text-2xl font-black text-white mb-8 flex items-center gap-4 tracking-tight uppercase">
                          <div className="w-1.5 h-6 bg-[#22c55e] rounded-full"></div>
                          猜你喜欢 / Recommended
                      </h3>
                      <div className="-mx-6 md:mx-0 px-6 md:px-0">
                          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 custom-scrollbar w-full">
                              {movie.vod_recs.map((rec, idx) => (
                                  <div key={idx} className="flex-shrink-0 w-[120px] md:w-[160px] cursor-pointer group" onClick={() => onSearch && onSearch(rec.name)}>
                                      <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden border border-white/10 mb-3 relative shadow-lg bg-gray-900 transition-transform duration-500 group-hover:scale-105">
                                          <ImageWithFallback src={rec.pic} alt={rec.name} searchKeyword={rec.name} size="m" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                      </div>
                                      <div className="text-xs md:text-sm font-bold text-white truncate group-hover:text-[#22c55e] transition-colors text-center px-1">{rec.name}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </section>
              )}
          </div>
      </article>
  );
};

export default MovieInfoCard;
