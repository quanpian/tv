
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
      <article className="relative w-full rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-[#0a0a0a] border border-white/5 shadow-3xl mt-8 md:mt-12 font-sans mb-16 ring-1 ring-white/10">
          <div className="absolute inset-0 z-0">
              <ImageWithFallback src={movie.vod_pic || ''} searchKeyword={movie.vod_name} className="w-full h-full object-cover opacity-15 blur-[100px] scale-150" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/40 via-[#0a0a0a] to-[#0a0a0a]"></div>
          </div>

          <div className="relative z-10 p-6 md:p-14 flex flex-col gap-10 md:gap-14">
              <header className="flex flex-col md:flex-row gap-10 md:gap-16 items-start">
                  <div className="flex-shrink-0 mx-auto md:mx-0">
                      <div className="w-[150px] h-[225px] md:w-[240px] md:h-[360px] rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/20 relative transition-transform hover:scale-105 duration-700 bg-gray-900">
                          <ImageWithFallback src={movie.vod_pic || ''} searchKeyword={movie.vod_name} priority={true} className="w-full h-full object-cover" />
                      </div>
                  </div>

                  <div className="flex-1 text-gray-200">
                      <h1 className="text-3xl md:text-6xl font-black text-white mb-6 flex items-center gap-4 flex-wrap tracking-tighter">
                          {movie.vod_name}
                          {movie.vod_remarks && (
                              <span className="text-[10px] md:text-xs font-black px-4 py-1 rounded-full border border-[#22c55e]/30 text-[#22c55e] bg-[#22c55e]/10 tracking-widest uppercase">
                                  {movie.vod_remarks}
                              </span>
                          )}
                      </h1>

                      <div className="flex flex-wrap gap-3 mb-8">
                          {movie.vod_area && <span className="bg-white/5 border border-white/10 text-white text-[11px] font-black px-4 py-1.5 rounded-full backdrop-blur-md uppercase tracking-widest">{movie.vod_area}</span>}
                          {movie.vod_year && <span className="bg-white/5 border border-white/10 text-white text-[11px] font-black px-4 py-1.5 rounded-full backdrop-blur-md">{movie.vod_year}</span>}
                          {score !== 'N/A' && <span className="bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-[11px] font-black px-4 py-1.5 rounded-full">★ {score}</span>}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 backdrop-blur-3xl">
                          <MetaItem label="导演" value={movie.vod_director} />
                          <MetaItem label="类型" value={movie.type_name} />
                          <div className="col-span-2"><MetaItem label="主演" value={movie.vod_actor} /></div>
                          <MetaItem label="语言" value={movie.vod_lang} />
                          <MetaItem label="发布时间" value={movie.vod_pubdate} />
                      </div>

                      <div className="text-base md:text-xl leading-relaxed text-gray-400 font-medium">
                          <h2 className="text-white font-black mb-4 text-xl md:text-2xl tracking-tighter uppercase">剧情蓝图 / SYNOPSIS</h2>
                          <p className={`whitespace-pre-line ${expanded ? '' : 'line-clamp-4 md:line-clamp-6 opacity-80'}`}>
                              {displayContent}
                          </p>
                          {isLongContent && (
                              <button onClick={() => setExpanded(!expanded)} className="text-[#22c55e] hover:text-[#4ade80] text-xs mt-6 font-black tracking-widest uppercase transition-all flex items-center gap-2">
                                  {expanded ? '收起详情 (COLLAPSE)' : '展开更多 (EXPAND)'}
                              </button>
                          )}
                      </div>
                  </div>
              </header>

              {movie.vod_actors_extended && movie.vod_actors_extended.length > 0 && (
                  <section className="border-t border-white/10 pt-10">
                      <h3 className="text-xl md:text-2xl font-black text-white mb-8 flex items-center gap-4 tracking-tighter uppercase">
                        <div className="w-1.5 h-6 bg-[#22c55e] rounded-full"></div>
                        演职人员 / Cast
                      </h3>
                      <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar">
                          {movie.vod_actors_extended.map((actor, idx) => (
                              <div key={idx} className="flex-shrink-0 w-24 md:w-32 flex flex-col items-center group/actor cursor-pointer">
                                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-white/10 mb-3 group-hover/actor:border-[#22c55e] transition-all duration-500 shadow-xl">
                                      <ImageWithFallback src={actor.pic} alt={actor.name} className="w-full h-full object-cover grayscale group-hover/actor:grayscale-0 transition-all duration-700" />
                                  </div>
                                  <div className="text-[12px] md:text-sm font-black text-white text-center truncate w-full mb-0.5">{actor.name}</div>
                                  <div className="text-[10px] font-bold text-gray-500 text-center truncate w-full uppercase">{actor.role || '演员'}</div>
                              </div>
                          ))}
                      </div>
                  </section>
              )}

              {movie.vod_recs && movie.vod_recs.length > 0 && (
                  <section className="border-t border-white/10 pt-10">
                      <h3 className="text-xl md:text-2xl font-black text-white mb-8 flex items-center gap-4 tracking-tighter uppercase">
                          <div className="w-1.5 h-6 bg-[#22c55e] rounded-full"></div>
                          猜你喜欢 / Recommended
                      </h3>
                      <div className="flex gap-4 md:gap-7 overflow-x-auto pb-6 no-scrollbar">
                          {movie.vod_recs.map((rec, idx) => (
                              <div key={idx} className="flex-shrink-0 w-[120px] md:w-[165px] cursor-pointer group/rec" onClick={() => onSearch && onSearch(rec.name)}>
                                  <div className="aspect-[2/3] w-full rounded-2xl md:rounded-[1.8rem] overflow-hidden border border-white/10 mb-3 relative shadow-xl bg-gray-900 transition-transform duration-700 group-hover/rec:scale-105">
                                      <ImageWithFallback src={rec.pic} alt={rec.name} searchKeyword={rec.name} size="m" className="w-full h-full object-cover transition-transform duration-1000 group-hover/rec:scale-110" />
                                  </div>
                                  <div className="text-[12px] md:text-[15px] font-black text-white truncate group-hover/rec:text-[#22c55e] transition-colors text-center px-1 tracking-tight">{rec.name}</div>
                              </div>
                          ))}
                      </div>
                  </section>
              )}

              {movie.vod_reviews && movie.vod_reviews.length > 0 && (
                  <section className="border-t border-white/10 pt-10">
                      <h3 className="text-xl md:text-2xl font-black text-white mb-10 flex items-center gap-4 tracking-tighter uppercase">
                          <div className="w-1.5 h-6 bg-[#22c55e] rounded-full"></div>
                          深度影评 / Fan Reviews
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {movie.vod_reviews.map((review, idx) => (
                              <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 transition-all hover:bg-white/[0.06] hover:border-white/20 animate-fade-in shadow-2xl backdrop-blur-3xl ring-1 ring-white/5">
                                  <div className="flex items-start gap-5">
                                      <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 rounded-full overflow-hidden border-2 border-white/10 bg-gray-800 shadow-xl">
                                          <ImageWithFallback src={review.avatar} alt={review.user} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                              <span className="text-white text-[15px] md:text-lg font-black truncate tracking-tight">{review.user}</span>
                                              <span className="text-[#22c55e] font-black text-[12px] md:text-sm tracking-tighter uppercase">{review.rating}</span>
                                          </div>
                                          <p className="text-gray-400 text-sm md:text-base leading-relaxed font-medium line-clamp-6 opacity-80">{review.content}</p>
                                          <div className="mt-6 flex items-center justify-between text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                              <span>{review.useful_count} HELPFUL</span>
                                              <span>{review.time}</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </section>
              )}
          </div>
      </article>
  );
};

export default MovieInfoCard;
