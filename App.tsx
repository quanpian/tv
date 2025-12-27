
import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense, useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHomeSections, getAggregatedSearch, getAggregatedMovieDetail, parseAllSources, fetchDoubanData, getHistory, addToHistory, initVodSources } from './services/vodService';
import MovieInfoCard from './components/MovieInfoCard';
import ImageWithFallback from './components/ImageWithFallback';
import { VodItem, VodDetail, Episode, PlaySource, HistoryItem } from './types';

const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const GeminiChat = lazy(() => import('./components/GeminiChat'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

const NavIcons = {
    home: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
    movies: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>,
    series: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" /></svg>,
    anime: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75s.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>,
    variety: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>,
    search: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>,
    settings: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
};

const TAB_TO_URL: Record<string, string> = { 'home': '/', 'movies': '/dianying', 'series': '/dianshiju', 'anime': '/dongman', 'variety': '/zongyi', 'search': '/sousuo' };
const URL_TO_TAB: Record<string, string> = { '': 'home', 'dianying': 'movies', 'dianshiju': 'series', 'dongman': 'anime', 'zongyi': 'variety', 'sousuo': 'search' };
const TAB_NAME: Record<string, string> = { 'home': '首页', 'movies': '电影', 'series': '剧集', 'anime': '动漫', 'variety': '综艺', 'search': '搜索' };

const HeroBanner = React.memo(({ items, onPlay }: { items: VodItem[], onPlay: (item: VodItem) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [detailsCache, setDetailsCache] = useState<Record<string, any>>({});
  const timerRef = useRef<number | null>(null);

  const activeItem = items[currentIndex];

  const prefetchDetails = useCallback(async (index: number) => {
    const item = items[index];
    if (!item || detailsCache[item.vod_id]) return;
    try {
        const res = await fetchDoubanData(item.vod_name, item.vod_id);
        if (res) {
            setDetailsCache(prev => ({ ...prev, [item.vod_id]: res }));
        }
    } catch (e) {}
  }, [items, detailsCache]);

  useEffect(() => {
    if (items.length <= 1) return;
    const handleNext = () => { startTransition(() => { setCurrentIndex((prev) => (prev + 1) % items.length); }); };
    timerRef.current = window.setInterval(handleNext, 12000);
    return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [items.length]);

  useEffect(() => {
      prefetchDetails(currentIndex);
      prefetchDetails((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, prefetchDetails]);

  if (!activeItem) return null;

  const currentDetail = detailsCache[activeItem.vod_id] || { 
      vod_name: activeItem.vod_name, 
      content: activeItem.vod_remarks || "精彩加载中...", 
      score: activeItem.vod_score || "7.8" 
  };

  return (
    <div className="relative w-full h-[240px] md:h-[340px] rounded-[2rem] md:rounded-[3rem] overflow-hidden mb-8 md:mb-12 bg-[#020617] border border-white/5 shadow-3xl group isolate transition-all">
      {/* 动态背景层 - 使用最小尺寸图片降低负载 */}
      <div key={activeItem.vod_id + '_bg'} className={`absolute inset-0 transition-all duration-1000 ease-in-out z-0 ${isPending ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}>
          <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="s" className="w-full h-full object-cover blur-[50px] opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/30 to-transparent"></div>
      </div>

      <div className="absolute inset-0 z-10 flex items-center px-6 md:px-16">
        <div key={activeItem.vod_id + '_content'} className={`flex flex-row items-center gap-8 md:gap-16 w-full transition-all duration-700 ${isPending ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            
            {/* 紧凑海报卡片 */}
            <div className="hidden sm:block flex-shrink-0 w-[100px] md:w-[180px] aspect-[2/3] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 z-20 transition-all duration-700 bg-gray-900 group/poster ring-1 ring-white/10">
                <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="m" className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover/poster:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <span className="text-brand font-black text-xl">★ {currentDetail?.score}</span>
                </div>
            </div>

            {/* 精简信息区 */}
            <div className="flex-1 space-y-2 md:space-y-4 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-brand text-black text-[8px] md:text-[10px] font-black px-3 py-0.5 rounded-full tracking-tighter uppercase">
                        {currentDetail?.score || 'HOT'}
                    </div>
                    <div className="bg-white/10 text-gray-300 text-[8px] md:text-[10px] font-bold px-3 py-0.5 rounded-full border border-white/5">
                        {activeItem.vod_year || '2025'}
                    </div>
                </div>

                <h2 className="text-2xl md:text-5xl font-black text-white leading-tight tracking-tighter truncate drop-shadow-lg">
                    {activeItem.vod_name}
                </h2>

                <div className="flex flex-col gap-0.5 text-gray-400 text-[9px] md:text-sm font-bold opacity-90 max-w-2xl tracking-tight">
                    <div className="line-clamp-1 flex items-center gap-2">
                        <span className="text-brand/80 px-1.5 py-0.5 rounded text-[7px] md:text-[9px] border border-brand/20">DIR</span>
                        <span className="text-gray-200">{currentDetail?.director || '未知'}</span>
                    </div>
                </div>

                <p className="text-gray-500 text-[9px] md:text-sm leading-relaxed line-clamp-2 md:line-clamp-3 max-w-xl font-medium opacity-80 border-l border-brand/20 pl-4 italic">
                    {currentDetail?.content || "正在同步精彩内容..."}
                </p>

                <div className="pt-2 md:pt-4 flex gap-3">
                    <button onClick={() => onPlay(activeItem)} className="bg-brand text-black hover:bg-brand-hover hover:scale-105 transition-all text-[10px] md:text-lg font-black px-8 py-2 md:px-12 md:py-3 rounded-[1rem] md:rounded-[1.5rem] flex items-center gap-2 shadow-xl active:scale-95 ring-2 ring-brand/10">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 md:w-6 md:h-6"><path d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" /></svg>
                        <span>播放</span>
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* 极简圆点 */}
      <div className="absolute bottom-4 right-10 z-20 flex gap-1">
          {items.map((_, i) => ( 
              <button 
                key={i} 
                onClick={() => startTransition(() => setCurrentIndex(i))}
                className={`h-1 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-6 bg-brand' : 'w-1 bg-white/10'}`} 
              /> 
          ))}
      </div>
    </div>
  );
});

const HorizontalSection = React.memo(({ title, items, id, onItemClick }: { title: string, items: (VodItem | HistoryItem)[], id: string, onItemClick: (item: VodItem) => void }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    if (!items || items.length === 0) return null;
    const displayItems = items.slice(0, 30); // 进一步限制初始加载数量

    return (
        <div className="mb-8 animate-fade-in group/section relative cv-auto" id={id}>
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-3 border-l-[4px] border-brand pl-4 tracking-tighter uppercase">
                    {title}
                </h3>
                <div className="hidden md:flex gap-2">
                    <button onClick={() => scrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' })} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-brand hover:text-black transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    </button>
                    <button onClick={() => scrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' })} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-brand hover:text-black transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </button>
                </div>
            </div>
            <div className="relative">
                <div ref={scrollRef} className="flex gap-4 md:gap-6 overflow-x-auto pb-4 no-scrollbar snap-x scroll-smooth">
                    {displayItems.map((item) => (
                        <div key={`${item.vod_id}-${(item as any).last_updated || ''}`} className="flex-shrink-0 w-[110px] md:w-[160px] snap-start cursor-pointer group/card" onClick={() => onItemClick(item)}>
                            <div className="aspect-[2/3] rounded-[1rem] md:rounded-[1.5rem] overflow-hidden relative shadow-lg bg-gray-900 border border-white/5 group-hover/card:border-brand/40 transition-all duration-500 group-hover/card:-translate-y-1">
                                <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} size="m" className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                                {(item as HistoryItem).episode_name && <div className="absolute bottom-0 inset-x-0 bg-brand/90 text-black text-[8px] md:text-[10px] font-black py-2 text-center truncate px-2">PLAY: {(item as HistoryItem).episode_name}</div>}
                                {(item as any).vod_remarks && <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-[8px] font-black text-white px-2 py-0.5 rounded-full">{(item as any).vod_remarks}</div>}
                            </div>
                            <h4 className="mt-2 text-[11px] md:text-[14px] text-gray-300 font-bold truncate group-hover/card:text-brand transition-colors px-1 text-center">
                                {item.vod_name}
                            </h4>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [currentMovie, setCurrentMovie] = useState<VodDetail | null>(null);
  const [availableSources, setAvailableSources] = useState<PlaySource[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(-1);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<'episodes' | 'sources'>('episodes');
  const [activeTab, setActiveTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [homeSections, setHomeSections] = useState<any>({ movies: [], series: [], anime: [], variety: [] });
  const [heroItems, setHeroItems] = useState<VodItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>([]);

  const [epPage, setEpPage] = useState(0);
  const EP_PER_PAGE = 32;

  useEffect(() => { initVodSources(); setWatchHistory(getHistory()); }, []);

  useEffect(() => {
      if (currentEpisodeIndex !== -1) { setEpPage(Math.floor(currentEpisodeIndex / EP_PER_PAGE)); }
  }, [currentEpisodeIndex]);

  useEffect(() => {
      if (currentMovie && currentSourceIndex !== -1 && currentEpisodeIndex !== -1) {
          const vodId = currentMovie.vod_id;
          localStorage.setItem(`cine_last_source_${vodId}`, String(currentSourceIndex));
          localStorage.setItem(`cine_last_episode_${vodId}`, String(currentEpisodeIndex));
          const episodeName = episodes[currentEpisodeIndex]?.title || '未知集数';
          const updated = addToHistory({ ...currentMovie, episode_index: currentEpisodeIndex, episode_name: episodeName, source_index: currentSourceIndex, last_updated: Date.now() } as HistoryItem);
          setWatchHistory(updated);
      }
  }, [currentSourceIndex, currentEpisodeIndex, currentMovie, episodes]);

  useEffect(() => {
       setLoading(true);
       getHomeSections().then(data => {
           if (data) {
               setHomeSections(data);
               const combined = [
                   ...data.movies.slice(0, 3), 
                   ...data.series.slice(0, 3), 
                   ...data.anime.slice(0, 2)
               ];
               setHeroItems(combined);
           }
           setLoading(false);
       });
  }, []);

  useEffect(() => {
      const path = location.pathname.split('/')[1] || '';
      if (path === 'play') {
          const id = location.pathname.split('/')[2];
          if (id && (!currentMovie || String(currentMovie.vod_id) !== id)) handleSelectMovie(id);
      } else {
          setActiveTab(URL_TO_TAB[path] || 'home');
          if (path !== 'play') setCurrentMovie(null); 
      }
  }, [location.pathname]);

  const handleSelectMovie = async (id: number | string, apiUrl?: string, vodName?: string) => {
      setLoading(true);
      try {
          const result = await getAggregatedMovieDetail(id, apiUrl, vodName);
          if (result && result.main) {
              const allSources = parseAllSources([result.main, ...result.alternatives]);
              if (allSources.length > 0) {
                  setAvailableSources(allSources);
                  const savedSIdx = parseInt(localStorage.getItem(`cine_last_source_${result.main.vod_id}`) || '0');
                  const sIdx = (savedSIdx >= 0 && savedSIdx < allSources.length) ? savedSIdx : 0;
                  setCurrentSourceIndex(sIdx);
                  setEpisodes(allSources[sIdx].episodes);
                  setCurrentMovie(result.main);
                  const savedEIdx = parseInt(localStorage.getItem(`cine_last_episode_${result.main.vod_id}`) || '0');
                  setCurrentEpisodeIndex((savedEIdx >= 0 && savedEIdx < allSources[sIdx].episodes.length) ? savedEIdx : 0);
              }
          }
      } catch (e) {} finally { setLoading(false); }
  };

  const handleItemClick = (item: VodItem) => {
      handleSelectMovie(item.vod_id, item.api_url, item.vod_name);
      navigate(`/play/${item.vod_id}`);
  };

  const MobileNav = () => (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-[#020617]/95 backdrop-blur-2xl border-t border-white/5 safe-area-bottom">
          <div className="grid grid-cols-6 h-14">
              {[
                  { id: 'home', label: '首页', icon: NavIcons.home },
                  { id: 'movies', label: '电影', icon: NavIcons.movies },
                  { id: 'series', label: '剧集', icon: NavIcons.series },
                  { id: 'anime', label: '动漫', icon: NavIcons.anime },
                  { id: 'variety', label: '综艺', icon: NavIcons.variety },
                  { id: 'search', label: '搜索', icon: NavIcons.search }
              ].map(item => (
                  <button key={item.id} onClick={() => navigate(TAB_TO_URL[item.id])} className={`flex flex-col items-center justify-center gap-0.5 transition-all duration-300 ${activeTab === item.id ? 'text-brand' : 'text-gray-500'}`}>
                      <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-105 text-brand' : 'scale-100'}`}>{(NavIcons as any)[item.id]}</div>
                      <span className="text-[9px] font-black">{item.label}</span>
                  </button>
              ))}
          </div>
      </div>
  );

  return (
      <div className="relative min-h-screen pb-20 lg:pb-16 pt-14 lg:pt-20 bg-[#020617]">
          {/* 紧凑型桌面导航 */}
          <nav className="fixed top-0 inset-x-0 z-50 bg-[#020617]/90 backdrop-blur-3xl border-b border-white/5 hidden lg:block h-16">
                <div className="container mx-auto max-w-[1500px] h-full flex items-center justify-between px-8">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-black font-black text-lg transition-transform group-hover:scale-105 border border-brand/20">C</div>
                        <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400 tracking-tighter uppercase">CineStream</span>
                    </div>
                    <div className="flex gap-1">
                        {['home', 'movies', 'series', 'anime', 'variety', 'search'].map(id => (
                            <button key={id} onClick={() => navigate(TAB_TO_URL[id])} className={`px-5 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === id ? 'bg-brand text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <span className={activeTab === id ? 'text-black' : 'text-brand'}>{(NavIcons as any)[id]}</span>
                                {TAB_NAME[id]}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                        {NavIcons.settings}
                    </button>
                </div>
          </nav>

          <div className="container mx-auto px-4 lg:px-10 max-w-[1600px]">
              {currentMovie && (
                  <section className="mb-10 space-y-5 animate-fade-in">
                      <div className="flex flex-col lg:flex-row bg-[#0f111a] rounded-[1.5rem] lg:rounded-[3rem] overflow-hidden border border-white/5 shadow-4xl relative ring-1 ring-white/10">
                          <div className={`flex-1 bg-black relative transition-all duration-700 ${!showSidePanel ? 'lg:h-[720px]' : 'lg:h-[540px] aspect-video'}`}>
                              <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center animate-pulse"><div className="w-12 h-12 border-[4px] border-brand border-t-transparent rounded-full animate-spin" /></div>}>
                                  <VideoPlayer url={availableSources[currentSourceIndex]?.episodes[currentEpisodeIndex]?.url || ''} poster={currentMovie.vod_pic} title={currentMovie.vod_name} episodeIndex={currentEpisodeIndex} vodId={currentMovie.vod_id} onNext={() => currentEpisodeIndex < episodes.length - 1 && setCurrentEpisodeIndex(prev => prev + 1)} />
                              </Suspense>
                              {!showSidePanel && (
                                  <button onClick={() => setShowSidePanel(true)} className="absolute top-6 right-6 z-30 px-8 py-3 rounded-2xl bg-black/50 backdrop-blur-2xl text-white font-black shadow-4xl border border-white/20 hover:bg-brand hover:text-black transition-all text-xs tracking-widest uppercase ring-1 ring-white/10">
                                      展开面板
                                  </button>
                              )}
                          </div>
                          {showSidePanel && (
                              <div className="w-full lg:w-[400px] flex flex-col border-l border-white/10 bg-[#0f111a]/98 backdrop-blur-3xl h-[400px] lg:h-auto shadow-inner">
                                  <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/30">
                                      <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                                          <h3 className="text-xs font-black text-white tracking-widest uppercase opacity-80">Control Center</h3>
                                      </div>
                                      <button onClick={() => setShowSidePanel(false)} className="px-3 py-1 rounded-full text-[9px] font-black text-gray-400 border border-white/10 hover:text-white transition-all uppercase">HIDE</button>
                                  </div>
                                  <div className="flex bg-black/20 border-b border-white/5">
                                      <button onClick={() => setSidePanelTab('episodes')} className={`flex-1 py-4 text-[10px] font-black transition-all relative ${sidePanelTab === 'episodes' ? 'text-brand bg-white/5' : 'text-gray-500'}`}>选集{sidePanelTab === 'episodes' && <div className="absolute bottom-0 inset-x-10 h-0.5 bg-brand shadow-[0_0_10px_#22c55e]" />}</button>
                                      <button onClick={() => setSidePanelTab('sources')} className={`flex-1 py-4 text-[10px] font-black transition-all relative ${sidePanelTab === 'sources' ? 'text-brand bg-white/5' : 'text-gray-500'}`}>线路{sidePanelTab === 'sources' && <div className="absolute bottom-0 inset-x-10 h-0.5 bg-brand shadow-[0_0_10px_#22c55e]" />}</button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-black/10">
                                      {sidePanelTab === 'episodes' ? (
                                          <div className="flex flex-col gap-5">
                                              {episodes.length > EP_PER_PAGE && (
                                                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                      {Array.from({ length: Math.ceil(episodes.length / EP_PER_PAGE) }).map((_, i) => (
                                                          <button key={i} onClick={() => setEpPage(i)} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black border transition-all ${epPage === i ? 'bg-brand border-brand text-black' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
                                                              {i * EP_PER_PAGE + 1}-{Math.min((i + 1) * EP_PER_PAGE, episodes.length)}
                                                          </button>
                                                      ))}
                                                  </div>
                                              )}
                                              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2">
                                                  {episodes.slice(epPage * EP_PER_PAGE, (epPage + 1) * EP_PER_PAGE).map((ep) => (
                                                      <button key={ep.index} onClick={() => setCurrentEpisodeIndex(ep.index)} className={`h-9 rounded-lg border text-[10px] font-black transition-all flex items-center justify-center ${currentEpisodeIndex === ep.index ? 'bg-brand text-black border-brand' : 'bg-white/5 text-gray-400 border-white/5 hover:text-brand'}`}>
                                                          {ep.index + 1}
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="space-y-3">
                                              {availableSources.map((source, idx) => (
                                                  <button key={idx} onClick={() => { setCurrentSourceIndex(idx); setEpisodes(source.episodes); setSidePanelTab('episodes'); }} className={`w-full text-left p-4 rounded-[1.2rem] border transition-all flex justify-between items-center ${currentSourceIndex === idx ? 'bg-brand/10 border-brand/40 text-brand' : 'bg-white/5 border-white/5 text-gray-500'}`}>
                                                      <div className="min-w-0">
                                                          <div className={`font-black text-xs mb-0.5 truncate ${currentSourceIndex === idx ? 'text-brand' : 'text-gray-300'}`}>{source.name}</div>
                                                          <div className="text-[8px] font-bold opacity-50 uppercase">{source.episodes.length} EP</div>
                                                      </div>
                                                  </button>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                      <MovieInfoCard movie={currentMovie} />
                  </section>
              )}
              {activeTab === 'home' && !currentMovie && (
                  <>
                      <HeroBanner items={heroItems} onPlay={handleItemClick} />
                      {watchHistory.length > 0 && <HorizontalSection title="继续观影" items={watchHistory} id="history" onItemClick={handleItemClick} />}
                      <HorizontalSection title="热门电影" items={homeSections.movies} id="movies" onItemClick={handleItemClick} />
                      <HorizontalSection title="热播剧集" items={homeSections.series} id="series" onItemClick={handleItemClick} />
                      <HorizontalSection title="人气动漫" items={homeSections.anime} id="anime" onItemClick={handleItemClick} />
                      <HorizontalSection title="综艺大咖" items={homeSections.variety} id="variety" onItemClick={handleItemClick} />
                  </>
              )}
          </div>
          <MobileNav />
          <Suspense fallback={null}><GeminiChat currentMovie={currentMovie} /></Suspense>
          <Suspense fallback={null}><SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} /></Suspense>
      </div>
  );
};

export default App;
