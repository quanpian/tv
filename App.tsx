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
  const [detail, setDetail] = useState<any>(null);
  
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => { startTransition(() => setCurrentIndex((prev) => (prev + 1) % items.length)); }, 10000); 
    return () => clearInterval(interval);
  }, [items.length]);

  useEffect(() => {
      if (items[currentIndex]) {
          fetchDoubanData(items[currentIndex].vod_name, items[currentIndex].vod_id).then(res => { if (res) setDetail(res); });
      }
  }, [currentIndex, items]);

  if (!items || items.length === 0) return null;
  const activeItem = items[currentIndex];

  return (
    <div className="relative w-full h-[300px] md:h-[420px] rounded-3xl md:rounded-[2.5rem] overflow-hidden mb-12 md:mb-16 bg-[#030712] border border-white/5 shadow-4xl group">
      <div key={activeItem.vod_id + '_bg'} className={`absolute inset-0 transition-all duration-1000 ${isPending ? 'opacity-40 blur-xl' : 'opacity-100 blur-0'}`}>
          <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="l" className="w-full h-full object-cover blur-[80px] opacity-30 scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-transparent to-transparent"></div>
      </div>
      <div className="absolute inset-0 z-10 flex items-center px-6 md:px-16 py-8">
        <div className="flex flex-row items-center gap-10 md:gap-14 w-full animate-slide-up">
            <div className="flex-shrink-0 w-[110px] md:w-[170px] aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-white/10 z-20 hover:scale-105 transition-transform duration-700 bg-gray-900 ring-1 ring-white/10">
                <ImageWithFallback key={activeItem.vod_id + '_hero_img'} src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="l" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-3 md:space-y-6 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="bg-[#22c55e] text-black text-[10px] md:text-sm font-black px-3 py-0.5 rounded shadow-[0_0_15px_#22c55e] tracking-widest">{detail?.score || '8.2'}</span>
                    <span className="bg-white/5 text-gray-300 text-[10px] md:text-sm font-bold px-3 py-0.5 rounded border border-white/5 backdrop-blur-md">{activeItem.vod_year || '2025'}</span>
                    <span className="bg-white/5 text-gray-300 text-[10px] md:text-sm font-bold px-3 py-0.5 rounded border border-white/5 backdrop-blur-md uppercase tracking-tighter">热门推荐</span>
                </div>
                <h2 className="text-3xl md:text-6xl font-black text-white leading-tight tracking-tighter truncate drop-shadow-2xl">{activeItem.vod_name}</h2>
                <div className="flex flex-col gap-1 text-gray-300 text-[11px] md:text-lg font-bold opacity-90">
                    <div className="line-clamp-1">导演: <span className="text-gray-400 font-medium">{detail?.director || '未知'}</span><span className="mx-3 text-gray-700">|</span>主演: <span className="text-gray-400 font-medium">{detail?.actor || '未知'}</span></div>
                </div>
                <p className="text-gray-400 text-[11px] md:text-base leading-relaxed line-clamp-2 md:line-clamp-3 max-w-3xl font-medium opacity-80">{detail?.content || "正在加载深度剧情简介，开启视觉盛宴..."}</p>
                <div className="pt-4 md:pt-8">
                    <button onClick={() => onPlay(activeItem)} className="bg-white text-black hover:bg-[#22c55e] text-xs md:text-xl font-black px-10 py-3.5 md:px-14 md:py-5 rounded-full flex items-center gap-3 transition-all hover:scale-110 active:scale-95 shadow-3xl group">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-8 md:h-8 transition-transform group-hover:scale-110"><path d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" /></svg>
                        <span>立即播放</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-2.5">
          {items.slice(0, 10).map((_, i) => ( 
              <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${i === currentIndex % 10 ? 'w-12 bg-[#22c55e] shadow-[0_0_10px_#22c55e]' : 'w-2 bg-white/10'}`} /> 
          ))}
      </div>
    </div>
  );
});

const HorizontalSection = React.memo(({ title, items, id, onItemClick }: { title: string, items: (VodItem | HistoryItem)[], id: string, onItemClick: (item: VodItem) => void }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    if (!items || items.length === 0) return null;
    return (
        <div className="mb-12 animate-fade-in group/section relative" id={id}>
            <div className="flex items-center justify-between mb-8 px-1">
                <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-4 border-l-[6px] border-[#22c55e] pl-6 tracking-tighter uppercase">{title}</h3>
                <div className="hidden md:flex gap-3">
                    <button onClick={() => scrollRef.current?.scrollBy({ left: -600, behavior: 'smooth' })} className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white hover:bg-[#22c55e] hover:text-black transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    </button>
                    <button onClick={() => scrollRef.current?.scrollBy({ left: 600, behavior: 'smooth' })} className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white hover:bg-[#22c55e] hover:text-black transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </button>
                </div>
            </div>
            <div className="relative">
                <div ref={scrollRef} className="flex gap-5 md:gap-7 overflow-x-auto pb-10 no-scrollbar snap-x scroll-smooth">
                    {items.map((item) => (
                        <div key={`${item.vod_id}-${(item as any).last_updated || ''}`} className="flex-shrink-0 w-[125px] md:w-[165px] snap-start cursor-pointer group/card" onClick={() => onItemClick(item)}>
                            <div className="aspect-[2/3] rounded-2xl md:rounded-[1.8rem] overflow-hidden relative shadow-2xl bg-gray-900 border border-white/5 group-hover/card:border-[#22c55e]/60 transition-all duration-500 ring-1 ring-white/10">
                                <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} size="m" className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110" />
                                {(item as HistoryItem).episode_name && <div className="absolute bottom-0 inset-x-0 bg-[#22c55e]/95 text-black text-[9px] md:text-[10px] font-black py-2 text-center truncate px-2">上次观看到: {(item as HistoryItem).episode_name}</div>}
                                {(item as any).vod_remarks && <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-[9px] font-black text-white px-2 py-0.5 rounded-lg border border-white/10">{(item as any).vod_remarks}</div>}
                            </div>
                            <h4 className="mt-4 text-[13px] md:text-base text-gray-200 font-bold truncate group-hover/card:text-[#22c55e] transition-colors px-1">{item.vod_name}</h4>
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
  const [searchResults, setSearchResults] = useState<VodItem[]>([]);
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
  const EP_PER_PAGE = 30;

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
               const combined = [...data.movies, ...data.series, ...data.anime, ...data.variety].sort(() => Math.random() - 0.5).slice(0, 15);
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
          <div className="grid grid-cols-6 h-16">
              {[
                  { id: 'home', label: '首页', icon: NavIcons.home },
                  { id: 'movies', label: '电影', icon: NavIcons.movies },
                  { id: 'series', label: '剧集', icon: NavIcons.series },
                  { id: 'anime', label: '动漫', icon: NavIcons.anime },
                  { id: 'variety', label: '综艺', icon: NavIcons.variety },
                  { id: 'search', label: '搜索', icon: NavIcons.search }
              ].map(item => (
                  <button key={item.id} onClick={() => navigate(TAB_TO_URL[item.id])} className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === item.id ? 'text-[#22c55e]' : 'text-gray-500'}`}>
                      <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'scale-100'}`}>{(NavIcons as any)[item.id]}</div>
                      <span className="text-[10px] font-black">{item.label}</span>
                  </button>
              ))}
          </div>
      </div>
  );

  return (
      <div className="relative min-h-screen pb-24 lg:pb-16 pt-16 lg:pt-24 bg-[#020617]">
          <nav className="fixed top-0 inset-x-0 z-50 bg-[#020617]/95 backdrop-blur-3xl border-b border-white/5 hidden lg:block">
                <div className="container mx-auto max-w-[1500px] h-16 flex items-center justify-between px-8">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}><div className="w-10 h-10 bg-[#22c55e] rounded-xl flex items-center justify-center text-black font-black text-xl shadow-lg shadow-[#22c55e]/30">C</div><span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#22c55e] to-cyan-400 tracking-tighter uppercase">CineStream</span></div>
                    <div className="flex gap-1">
                        {['home', 'movies', 'series', 'anime', 'variety', 'search'].map(id => (
                            <button key={id} onClick={() => navigate(TAB_TO_URL[id])} className={`px-6 py-2 rounded-full text-sm font-black transition-all flex items-center gap-2 ${activeTab === id ? 'bg-[#22c55e] text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>{(NavIcons as any)[id]}{TAB_NAME[id]}</button>
                        ))}
                    </div>
                    <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-colors">{NavIcons.settings}</button>
                </div>
          </nav>

          <div className="container mx-auto px-5 lg:px-12 max-w-[1800px]">
              {currentMovie && (
                  <section className="mb-14 space-y-7 animate-fade-in">
                      <div className="flex flex-col lg:flex-row bg-[#0f111a] rounded-[2rem] lg:rounded-[3.5rem] overflow-hidden border border-white/5 shadow-4xl relative ring-1 ring-white/10">
                          <div className={`flex-1 bg-black relative transition-all duration-700 ${!showSidePanel ? 'lg:h-[750px]' : 'lg:h-[550px] aspect-video'}`}>
                              <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center animate-pulse"><div className="w-14 h-14 border-[5px] border-[#22c55e] border-t-transparent rounded-full animate-spin" /></div>}>
                                  <VideoPlayer url={availableSources[currentSourceIndex]?.episodes[currentEpisodeIndex]?.url || ''} poster={currentMovie.vod_pic} title={currentMovie.vod_name} episodeIndex={currentEpisodeIndex} vodId={currentMovie.vod_id} onNext={() => currentEpisodeIndex < episodes.length - 1 && setCurrentEpisodeIndex(prev => prev + 1)} />
                              </Suspense>
                              {!showSidePanel && <button onClick={() => setShowSidePanel(true)} className="absolute top-8 right-8 z-30 px-12 py-4.5 rounded-full bg-white/10 backdrop-blur-3xl text-white font-black shadow-4xl border border-white/20 hover:bg-white/20 transition-all text-base tracking-widest uppercase">展开剧集中心</button>}
                          </div>
                          {showSidePanel && (
                              <div className="w-full lg:w-[400px] flex flex-col border-l border-white/10 bg-[#0f111a]/95 backdrop-blur-4xl h-[450px] lg:h-auto shadow-inner">
                                  <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/40">
                                      <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse"></div><h3 className="text-sm font-black text-white tracking-[0.2em] uppercase">播放控制台</h3></div>
                                      <button onClick={() => setShowSidePanel(false)} className="px-5 py-2 rounded-full text-[10px] font-black text-gray-400 border border-white/10 hover:text-white transition-all uppercase">隐藏</button>
                                  </div>
                                  <div className="flex bg-black/40 border-b border-white/5">
                                      <button onClick={() => setSidePanelTab('episodes')} className={`flex-1 py-5 text-sm font-black transition-all relative ${sidePanelTab === 'episodes' ? 'text-[#22c55e] bg-white/5' : 'text-gray-500'}`}>选集播放{sidePanelTab === 'episodes' && <div className="absolute bottom-0 inset-x-8 h-1 bg-[#22c55e] shadow-[0_0_15px_#22c55e]" />}</button>
                                      <button onClick={() => setSidePanelTab('sources')} className={`flex-1 py-5 text-sm font-black transition-all relative ${sidePanelTab === 'sources' ? 'text-[#22c55e] bg-white/5' : 'text-gray-500'}`}>切换线路{sidePanelTab === 'sources' && <div className="absolute bottom-0 inset-x-8 h-1 bg-[#22c55e] shadow-[0_0_15px_#22c55e]" />}</button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/20">
                                      {sidePanelTab === 'episodes' ? (
                                          <div className="flex flex-col gap-6">
                                              {episodes.length > EP_PER_PAGE && (
                                                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                                      {Array.from({ length: Math.ceil(episodes.length / EP_PER_PAGE) }).map((_, i) => (
                                                          <button key={i} onClick={() => setEpPage(i)} className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black border transition-all ${epPage === i ? 'bg-[#22c55e] border-[#22c55e] text-black shadow-lg' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                                              {i * EP_PER_PAGE + 1} - {Math.min((i + 1) * EP_PER_PAGE, episodes.length)}
                                                          </button>
                                                      ))}
                                                  </div>
                                              )}
                                              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-4">
                                                  {episodes.slice(epPage * EP_PER_PAGE, (epPage + 1) * EP_PER_PAGE).map((ep) => (
                                                      <button key={ep.index} onClick={() => setCurrentEpisodeIndex(ep.index)} className={`h-11 rounded-2xl border text-[13px] font-black transition-all flex items-center justify-center ${currentEpisodeIndex === ep.index ? 'bg-[#22c55e] text-black border-[#22c55e] shadow-lg shadow-[#22c55e]/30' : 'bg-white/5 text-gray-400 border-white/5 hover:text-[#22c55e]'}`}>{ep.index + 1}</button>
                                                  ))}
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="space-y-4">
                                              {availableSources.map((source, idx) => (
                                                  <button key={idx} onClick={() => { setCurrentSourceIndex(idx); setEpisodes(source.episodes); setSidePanelTab('episodes'); }} className={`w-full text-left p-5 rounded-3xl border transition-all flex justify-between items-center ${currentSourceIndex === idx ? 'bg-[#22c55e]/10 border-[#22c55e]/50 text-[#22c55e]' : 'bg-white/5 border-white/5 text-gray-500'}`}>
                                                      <div className="min-w-0"><div className="font-black text-sm mb-1 truncate">{source.name}</div><div className="text-[10px] font-bold opacity-60 uppercase">{source.episodes.length} Episodes</div></div>
                                                      {currentSourceIndex === idx && <div className="w-3 h-3 rounded-full bg-[#22c55e] shadow-[0_0_15px_#22c55e]" />}
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
                      <HorizontalSection title="热门精选" items={homeSections.movies} id="movies" onItemClick={handleItemClick} />
                      <HorizontalSection title="近期热播" items={homeSections.series} id="series" onItemClick={handleItemClick} />
                      <HorizontalSection title="超人气番剧" items={homeSections.anime} id="anime" onItemClick={handleItemClick} />
                      <HorizontalSection title="欢乐综艺" items={homeSections.variety} id="variety" onItemClick={handleItemClick} />
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