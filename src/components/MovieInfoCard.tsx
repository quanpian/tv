
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
      <article className="relative w-full rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden bg-[#0a0a0a] border border-white/5 shadow-3xl mt-8 md:mt-12 font-sans mb-16 ring-1 ring-white/10 isolate">
          {/* 背景毛玻璃幻灯片效果 */}
          <div className="absolute inset-0 z-0 overflow-hidden">
              <ImageWithFallback src={movie.vod_pic || ''} searchKeyword={movie.vod_name} className="w-full h-full object-cover opacity-20 blur-[120px] scale-150 transition-all duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/80 to-[#0a0a0a]"></div>
          </div>

          <div className="relative z-10 p-6 md:p-14 flex flex-col gap-12 md:gap-20">
              {/* 核心信息区 */}
              <header className="flex flex-col md:flex-row gap-10 md:gap-20 items-start">
                  <div className="flex-shrink-0 mx-auto md:mx-0 group">
                      <div className="w-[180px] h-[270px] md:w-[280px] md:h-[420px] rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.9)] border border-white/20 relative transition-all duration-700 group-hover:scale-105 group-hover:-rotate-1 ring-2 ring-white/5">
                          <ImageWithFallback src={movie.vod_pic || ''} searchKeyword={movie.vod_name} priority={true} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center pb-12">
                             <div className="text-brand font-black text-5xl drop-shadow-[0_0_20px_#22c55e]">★ {score}</div>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 text-gray-200">
                      <div className="flex flex-wrap items-center gap-4 mb-6">
                          {movie.vod_remarks && (
                              <span className="text-[10px] md:text-xs font-black px-4 py-1.5 rounded-full border border-brand/40 text-brand bg-brand/10 tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                  {movie.vod_remarks}
                              </span>
                          )}
                          <span className="bg-white/10 border border-white/10 text-gray-400 text-[10px] md:text-xs font-black px-4 py-1.5 rounded-full backdrop-blur-md uppercase tracking-widest">{movie.vod_year || '2024'}</span>
                      </div>

                      <h1 className="text-4xl md:text-7xl font-black text-white mb-10 tracking-tighter leading-[1.05] drop-shadow-2xl">
                          {movie.vod_name}
                      </h1>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12 bg-white/[0.03] p-8 md:p-10 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl shadow-inner ring-1 ring-white/5">
                          <MetaItem label="导演" value={movie.vod_director} />
                          <MetaItem label="编剧" value={movie.vod_writer} />
                          <div className="col-span-2"><MetaItem label="主演" value={movie.vod_actor} /></div>
                          <MetaItem label="类型" value={movie.type_name} />
                          <MetaItem label="地区" value={movie.vod_area} />
                          <MetaItem label="上映" value={movie.vod_pubdate} />
                          <MetaItem label="语言" value={movie.vod_lang} />
                      </div>

                      <div className="text-base md:text-xl leading-relaxed text-gray-400 font-medium">
                          <h2 className="text-white font-black mb-6 text-xl md:text-2xl tracking-tight flex items-center gap-3">
                              剧情简介
                              <div className="h-px flex-1 bg-white/10"></div>
                          </h2>
                          <p className={`whitespace-pre-line break-words transition-all duration-700 ${expanded ? '' : 'line-clamp-4 md:line-clamp-5 opacity-80'}`}>
                              {displayContent}
                          </p>
                          {isLongContent && (
                              <button onClick={() => setExpanded(!expanded)} className="text-brand hover:text-brand-hover text-sm mt-8 font-black tracking-widest uppercase transition-all flex items-center gap-3 group px-6 py-2 rounded-full border border-brand/20 bg-brand/5 hover:bg-brand/10">
                                  {expanded ? '收起详情' : '展开全景'}
                                  <div className={`transition-transform duration-500 ${expanded ? 'rotate-180' : ''}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                                  </div>
                              </button>
                          )}
                      </div>
                  </div>
              </header>

              {/* 显眼的演职人员区 - 移至更高层级 */}
              {movie.vod_actors_extended && movie.vod_actors_extended.length > 0 && (
                  <section className="relative">
                      <div className="flex items-center justify-between mb-10">
                          <h3 className="text-2xl md:text-4xl font-black text-white flex items-center gap-5 tracking-tighter uppercase">
                            演职人员
                            <span className="text-xs md:text-sm font-black text-gray-500 tracking-widest uppercase opacity-50">Visual Cast</span>
                          </h3>
                      </div>
                      <div className="flex gap-8 overflow-x-auto pb-8 no-scrollbar scroll-smooth">
                          {movie.vod_actors_extended.map((actor, idx) => (
                              <div key={idx} className="flex-shrink-0 w-28 md:w-40 flex flex-col items-center group/actor cursor-pointer">
                                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-[3px] border-white/5 mb-5 group-hover/actor:border-brand group-hover/actor:shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all duration-500 group-hover/actor:scale-110 shadow-2xl relative">
                                      <ImageWithFallback src={actor.pic} alt={actor.name} className="w-full h-full object-cover transition-all duration-700" />
                                      <div className="absolute inset-0 bg-brand/10 opacity-0 group-hover/actor:opacity-100 transition-opacity"></div>
                                  </div>
                                  <div className="text-[13px] md:text-base font-black text-white text-center truncate w-full mb-1 group-hover/actor:text-brand transition-colors">{actor.name}</div>
                                  <div className="text-[10px] md:text-xs font-bold text-gray-500 text-center truncate w-full uppercase tracking-tighter opacity-60">{actor.role || '演员'}</div>
                              </div>
                          ))}
                      </div>
                  </section>
              )}

              {/* 为您推荐 */}
              {movie.vod_recs && movie.vod_recs.length > 0 && (
                  <section className="relative border-t border-white/5 pt-16 md:pt-24">
                      <h3 className="text-2xl md:text-4xl font-black text-white mb-12 flex items-center gap-5 tracking-tighter uppercase">
                          为您推荐
                          <span className="text-xs md:text-sm font-black text-gray-500 tracking-widest uppercase opacity-50">Recommendations</span>
                      </h3>
                      <div className="-mx-6 md:mx-0 px-6 md:px-0">
                          <div className="flex gap-8 md:gap-12 overflow-x-auto pb-12 custom-scrollbar w-full">
                              {movie.vod_recs.map((rec, idx) => (
                                  <div key={idx} className="flex-shrink-0 w-[160px] md:w-[240px] cursor-pointer group" onClick={() => onSearch && onSearch(rec.name)}>
                                      <div className="aspect-[2/3] w-full rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/10 mb-6 relative shadow-2xl transition-all duration-1000 group-hover:scale-105 group-hover:-translate-y-4 ring-1 ring-white/10 bg-gray-900 group-hover:shadow-brand/20 group-hover:shadow-3xl">
                                          <ImageWithFallback src={rec.pic} alt={rec.name} searchKeyword={rec.name} size="m" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-500 flex items-center justify-center">
                                              <div className="w-16 h-16 rounded-full bg-brand/90 flex items-center justify-center text-black scale-0 group-hover:scale-100 transition-all duration-500 shadow-[0_0_40px_#22c55e] rotate-[-45deg] group-hover:rotate-0">
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="text-sm md:text-xl font-black text-white truncate group-hover:text-brand transition-colors text-center px-4 tracking-tighter">{rec.name}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </section>
              )}

              {/* 豆瓣精选影评 - 猜你喜欢下方 */}
              {movie.vod_reviews && movie.vod_reviews.length > 0 && (
                  <section className="relative border-t border-white/5 pt-16 md:pt-24 pb-10">
                      <div className="flex items-center justify-between mb-12">
                          <h3 className="text-2xl md:text-4xl font-black text-white flex items-center gap-5 tracking-tighter uppercase">
                              观众短评
                              <span className="text-xs md:text-sm font-black text-brand tracking-widest uppercase px-3 py-1 bg-brand/10 rounded-lg border border-brand/20">DOUBAN</span>
                          </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                          {movie.vod_reviews.map((review: any, idx) => (
                              <article key={idx} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 md:p-12 transition-all hover:bg-white/[0.05] hover:border-white/20 animate-fade-in shadow-2xl backdrop-blur-[50px] ring-1 ring-white/5 flex flex-col gap-6 relative group/review">
                                  <div className="flex items-center gap-5 md:gap-6">
                                      <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 rounded-full overflow-hidden border-2 border-white/10 bg-gray-800 shadow-2xl transition-transform group-hover/review:scale-110">
                                          <ImageWithFallback src={review.avatar} alt={review.user} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-3 mb-1">
                                              <span className="text-white text-lg md:text-xl font-black truncate tracking-tight">{review.user}</span>
                                              <div className="flex items-center gap-1 text-yellow-500 font-black text-xs md:text-sm bg-yellow-500/5 px-3 py-1 rounded-full border border-yellow-500/20">
                                                  <span>★</span>
                                                  <span className="tracking-tighter">{review.rating}</span>
                                              </div>
                                          </div>
                                          <div className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                              <span>{review.time}</span>
                                              {review.location && <span>• {review.location}</span>}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex-1 relative">
                                      <svg className="absolute -top-4 -left-4 w-10 h-10 text-white/5 -z-10" fill="currentColor" viewBox="0 0 32 32"><path d="M10 8v8H6c0 2.2 1.8 4 4 4v4c-4.4 0-8-3.6-8-8V8h8zm16 0v8h-4c0 2.2 1.8 4 4 4v4c-4.4 0-8-3.6-8-8V8h8z"></path></svg>
                                      <p className="text-gray-300 text-base md:text-lg leading-relaxed font-medium line-clamp-6 italic relative z-10">
                                          {review.content}
                                      </p>
                                  </div>

                                  <div className="flex items-center justify-start gap-4 pt-4 border-t border-white/5">
                                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs font-black text-gray-400 group-hover/review:text-brand group-hover/review:border-brand/30 transition-all">
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.527c-1.351 0-2.451-1.1-2.451-2.45V12.75c0-1.35 1.1-2.45 2.45-2.45h.527c.445 0 .72.498.523.898-.097.197-.187.397-.27.602" /></svg>
                                          <span>{review.useful_count || 0} 有用</span>
                                      </div>
                                  </div>
                              </article>
                          ))}
                      </div>
                  </section>
              )}
          </div>
      </article>
  );
};

export default MovieInfoCard;
