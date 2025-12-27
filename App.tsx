import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense, useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHomeSections, getAggregatedSearch, getAggregatedMovieDetail, parseAllSources, fetchDoubanData, fetchCategoryItems, getHistory, addToHistory, removeFromHistory, fetchPersonDetail, initVodSources } from './services/vodService';
import MovieInfoCard from './components/MovieInfoCard';
import ImageWithFallback from './components/ImageWithFallback';
import { VodItem, VodDetail, Episode, PlaySource, HistoryItem, PersonDetail } from './types';

const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const GeminiChat = lazy(() => import('./components/GeminiChat'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

const NavIcons = {
    Home: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
    Search: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
    Movie: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125 1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 5.496 4.5 4.875 4.5M6 9.375c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125V8.625c0-.621-.504-1.125-1.125-1.125h-1.5" /></svg>,
    Series: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" /></svg>,
    Anime: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>,
    Variety: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
    Settings: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>
};

const URL_TO_TAB: Record<string, string> = { '': 'home', 'dianying': 'movies', 'dianshiju': 'series', 'dongman': 'anime', 'zongyi': 'variety', 'sousuo': 'search' };
const TAB_TO_URL: Record<string, string> = { 'home': '/', 'movies': '/dianying', 'series': '/dianshiju', 'anime': '/dongman', 'variety': '/zongyi', 'search': '/sousuo' };

const HeroBanner = React.memo(({ items, onPlay }: { items: VodItem[], onPlay: (item: VodItem) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [detail, setDetail] = useState<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => { startTransition(() => { setCurrentIndex((prev) => (prev + 1) % items.length); }); }, 9000); 
    return () => clearInterval(interval);
  }, [items.length]);

  useEffect(() => {
      if (items && items.length > 0) {
          const item = items[currentIndex];
          setDetail(null);
          if (abortRef.current) abortRef.current.abort();
          abortRef.current = new AbortController();
          fetchDoubanData(item.vod_name, item.vod_id).then(res => { if (res) setDetail(res); }).catch(() => {});
      }
      return () => abortRef.current?.abort();
  }, [currentIndex, items]);

  if (!items || items.length === 0) return null;
  const activeItem = items[currentIndex];
  return (
    <div className="relative w-full h-[220px] md:h-[380px] rounded-2xl md:rounded-[2.5rem] overflow-hidden mb-10 md:mb-16 group shadow-2xl bg-[#0a0a0a] border border-white/5">
      <div key={activeItem.vod_id + '_bg'} className={`absolute inset-0 animate-fade-in transition-all duration-1000 ${isPending ? 'opacity-40 blur-xl scale-110' : 'opacity-100 blur-0 scale-100'}`}>
          <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="l" className="w-full h-full object-cover blur-md opacity-40 scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-transparent"></div>
      </div>
      <div key={activeItem.vod_id + '_content'} className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="container mx-auto px-6 md:px-16 w-full h-full flex items-center">
            <div className="flex flex-row items-center gap-6 md:gap-12 w-full animate-slide-up">
                <div className="flex-shrink-0 w-[100px] md:w-[180px] aspect-[2/3] rounded-xl md:rounded-2xl overflow-hidden shadow-3xl border border-white/20 relative z-20 hover:scale-105 transition-transform duration-700 bg-black">
                    <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="l" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-left space-y-2 md:space-y-5 flex flex-col items-start justify-center min-w-0">
                    <div className="flex flex-wrap items-center justify-start gap-2">
                        <span className="bg-brand text-black text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full uppercase shadow-[0_0_15px_rgba(34,197,94,0.4)]">{detail?.score || activeItem.vod_score || 'TOP'}</span>
                        <span className="bg-white/10 border border-white/10 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-md">{activeItem.vod_year || '2025'}</span>
                    </div>
                    <h2 className="text-2xl md:text-5xl font-black text-white leading-tight drop-shadow-2xl tracking-tighter line-clamp-1">{activeItem.vod_name}</h2>
                    <p className="text-gray-400 text-[11px] md:text-sm leading-relaxed line-clamp-2 md:line-clamp-3 drop-shadow-md max-w-2xl hidden xs:block">{detail?.content || activeItem.vod_remarks || "精彩内容即将呈现..."}</p>
                    <div className="pt-2 md:pt-4">
                        <button onClick={() => onPlay(activeItem)} className="bg-white text-black hover:bg-brand hover:text-black text-xs md:text-lg font-black px-6 py-2.5 md:px-12 md:py-4 rounded-full flex items-center gap-2 transition-all hover:scale-110 shadow-2xl active:scale-95 group">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>
                            <span>立即观赏</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
});

const HorizontalSection = React.memo(({ title, items, id, onItemClick, onItemContextMenu }: { title: string, items: (VodItem | HistoryItem)[], id: string, onItemClick: (item: VodItem) => void, onItemContextMenu?: (e: React.MouseEvent, item: VodItem) => void }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    if (!items || items.length === 0) return null;
    return (
        <div className="mb-10 animate-fade-in group/section cv-auto" id={id}>
            <div className="flex justify-between items-end mb-5 px-1">
                <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3 border-l-[6px] border-brand pl-4 tracking-tighter">{title}</h3>
            </div>
            <div className="relative group">
                <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-6 no-scrollbar snap-x scroll-smooth">
                    {items.map((item) => (
                        <div key={`${item.vod_id}-${(item as HistoryItem).last_updated || ''}`} className="flex-shrink-0 w-[140px] md:w-[190px] snap-start cursor-pointer relative group/card" onClick={() => onItemClick(item)} onContextMenu={(e) => onItemContextMenu && onItemContextMenu(e, item)}>
                            <div className="aspect-[2/3] rounded-2xl overflow-hidden relative shadow-xl bg-gray-900 border border-white/5 group-hover/card:border-brand/40 transition-all duration-500 ring-1 ring-white/10">
                                <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} size="m" className="w-full h-full object-cover transform group-hover/card:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/30 transition-colors"></div>
                                {(item as any).vod_remarks && <div className="absolute top-2 right-2 bg-black/70 text-[9px] font-black text-white px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">{(item as any).vod_remarks}</div>}
                                {(item as HistoryItem).episode_name && ( <div className="absolute bottom-0 left-0 right-0 bg-brand/95 text-black text-[10px] font-black px-2 py-1.5 text-center truncate">上次: {(item as HistoryItem).episode_name}</div> )}
                            </div>
                            <h4 className="mt-3 text-sm text-gray-200 font-bold truncate group-hover:text-brand transition-colors px-1">{item.vod_name}</h4>
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
  const [personProfile, setPersonProfile] = useState<PersonDetail | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentMovie, setCurrentMovie] = useState<VodDetail | null>(null);
  const [availableSources, setAvailableSources] = useState<PlaySource[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(-1);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<'episodes' | 'sources'>('episodes');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [homeSections, setHomeSections] = useState<any>({ movies: [], series: [], anime: [], variety: [] });
  const [heroItems, setHeroItems] = useState<VodItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>([]);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, item: VodItem | null }>({ visible: false, x: 0, y: 0, item: null });

  useEffect(() => { initVodSources(); setWatchHistory(getHistory()); }, []);

  // 监听全局点击以关闭右键菜单
  useEffect(() => {
    const handleGlobalClick = () => { if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false }); };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleGlobalClick, true);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleGlobalClick, true);
    };
  }, [contextMenu.visible]);

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
       getHomeSections().then(initialData => {
           if (initialData) {
               setHomeSections(initialData);
               setHeroItems([ ...initialData.movies, ...initialData.series, ...initialData.anime ].slice(0, 30));
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
              const { main, alternatives } = result;
              const allSources = parseAllSources([main, ...alternatives]);
              if (allSources.length > 0) {
                  setAvailableSources(allSources);
                  const savedSIdx = parseInt(localStorage.getItem(`cine_last_source_${main.vod_id}`) || '0');
                  const sIdx = (savedSIdx >= 0 && savedSIdx < allSources.length) ? savedSIdx : 0;
                  setCurrentSourceIndex(sIdx);
                  setEpisodes(allSources[sIdx].episodes);
                  setCurrentMovie(main);
                  const savedEIdx = parseInt(localStorage.getItem(`cine_last_episode_${main.vod_id}`) || '0');
                  setCurrentEpisodeIndex((!isNaN(savedEIdx) && savedEIdx >= 0 && savedEIdx < allSources[sIdx].episodes.length) ? savedEIdx : 0);
              }
          }
      } catch (error) {} finally { setLoading(false); }
  };

  const handleDeleteHistory = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (contextMenu.item) {
          const updated = removeFromHistory(contextMenu.item.vod_id);
          setWatchHistory(updated);
          setContextMenu({ ...contextMenu, visible: false });
      }
  };

  const handleItemClick = (item: VodItem) => {
      if (item.type_name === 'celebrity') {
        setLoading(true);
        fetchPersonDetail(item.vod_id).then(detail => { if (detail) { setPersonProfile(detail); setSearchResults(detail.works || []); } setLoading(false); });
        return;
      }
      handleSelectMovie(item.vod_id, item.api_url, item.vod_name);
      navigate(`/play/${item.vod_id}`);
  };

  const triggerSearch = async (query: string) => {
      if(!query.trim()) return;
      setSearchQuery(query);
      setLoading(true);
      setHasSearched(true);
      if (activeTab !== 'search') navigate(TAB_TO_URL['search']);
      try {
          const results = await getAggregatedSearch(query);
          setSearchResults(results);
          if (resultsRef.current) resultsRef.current.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {} finally { setLoading(false); }
  };

  return (
      <div className="relative min-h-screen pb-24 lg:pb-16 overflow-x-hidden pt-14 lg:pt-20">
          <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/90 backdrop-blur-3xl border-b border-white/5 hidden lg:block h-16">
                <div className="container mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}><div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-black font-black">C</div><span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400 tracking-tighter">CineStream</span></div>
                    <div className="flex gap-1">
                        {['home', 'movies', 'series', 'anime', 'variety', 'search'].map(id => ( <button key={id} onClick={() => navigate(TAB_TO_URL[id])} className={`px-5 py-2 rounded-full text-sm font-black transition-all ${activeTab === id ? 'bg-brand text-black shadow-2xl' : 'text-gray-400 hover:text-white'}`}>{id.toUpperCase()}</button> ))}
                    </div>
                    <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white p-2">{NavIcons.Settings}</button>
                </div>
          </nav>

          <div className="container mx-auto px-4 lg:px-10 py-4 max-w-[1600px]">
              {currentMovie && (
                  <section className="mb-12 animate-fade-in space-y-6">
                      <div className="flex flex-col lg:flex-row bg-[#0f111a] rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-4xl relative ring-1 ring-white/10">
                          <div className={`flex-1 bg-black relative transition-all duration-700 ${!showSidePanel ? 'lg:h-[720px]' : 'lg:h-[550px] aspect-video'}`}>
                              <Suspense fallback={null}><VideoPlayer url={availableSources[currentSourceIndex]?.episodes[currentEpisodeIndex]?.url || ''} poster={currentMovie.vod_pic} title={currentMovie.vod_name} episodeIndex={currentEpisodeIndex} vodId={currentMovie.vod_id} onNext={() => currentEpisodeIndex < episodes.length - 1 && setCurrentEpisodeIndex(prev => prev + 1)} /></Suspense>
                              {!showSidePanel && ( <button onClick={() => setShowSidePanel(true)} className="absolute top-6 right-6 z-30 px-8 py-3 rounded-full bg-white/10 backdrop-blur-xl text-white font-black border border-white/20 hover:bg-white/20 transition-all text-sm uppercase tracking-widest">展开面板</button> )}
                          </div>
                          {showSidePanel && (
                              <div className="w-full lg:w-[380px] flex flex-col border-l border-white/10 bg-[#0f111a]/80 backdrop-blur-3xl h-[450px] lg:h-auto">
                                  <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/40"><h3 className="text-sm font-black text-white tracking-widest uppercase">播放列表</h3><button onClick={() => setShowSidePanel(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-all">隐藏</button></div>
                                  <div className="flex bg-black/20">
                                      <button onClick={() => setSidePanelTab('episodes')} className={`flex-1 py-4 text-[11px] font-black uppercase transition-all relative ${sidePanelTab === 'episodes' ? 'text-brand' : 'text-gray-500'}`}>选集{sidePanelTab === 'episodes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}</button>
                                      <button onClick={() => setSidePanelTab('sources')} className={`flex-1 py-4 text-[11px] font-black uppercase transition-all relative ${sidePanelTab === 'sources' ? 'text-brand' : 'text-gray-500'}`}>线路{sidePanelTab === 'sources' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}</button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                                      {sidePanelTab === 'episodes' ? ( <div className="grid grid-cols-4 gap-3">{episodes.map((ep) => ( <button key={ep.index} onClick={() => setCurrentEpisodeIndex(ep.index)} className={`h-11 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center ${currentEpisodeIndex === ep.index ? 'bg-brand text-black border-brand' : 'bg-white/5 text-gray-400 border-white/5 hover:text-brand'}`}>{ep.index + 1}</button> ))}</div> ) : ( <div className="space-y-3">{availableSources.map((source, idx) => ( <button key={idx} onClick={() => { setCurrentSourceIndex(idx); setEpisodes(source.episodes); setSidePanelTab('episodes'); }} className={`w-full text-left p-4 rounded-2xl border transition-all flex justify-between items-center ${currentSourceIndex === idx ? 'bg-brand/10 border-brand/40 text-brand' : 'bg-white/5 border-white/5 text-gray-400'}`}><div className="min-w-0"><div className="font-black text-xs truncate">{source.name}</div><div className="text-[10px] opacity-60 uppercase">{source.episodes.length} 集</div></div>{currentSourceIndex === idx && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}</button> ))}</div> )}
                                  </div>
                              </div>
                          )}
                      </div>
                      <MovieInfoCard movie={currentMovie} onSearch={triggerSearch} />
                  </section>
              )}

              {activeTab === 'home' && !currentMovie && (
                  <>
                      {heroItems.length > 0 && <HeroBanner items={heroItems} onPlay={handleItemClick} />}
                      {watchHistory.length > 0 && <HorizontalSection title="继续观看" items={watchHistory} id="history" onItemClick={handleItemClick} onItemContextMenu={(e, item) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item }); }} />}
                      <HorizontalSection title="热门电影" items={homeSections.movies} id="movies" onItemClick={handleItemClick} />
                      <HorizontalSection title="热播剧集" items={homeSections.series} id="series" onItemClick={handleItemClick} />
                      <HorizontalSection title="精选综艺" items={homeSections.variety} id="variety" onItemClick={handleItemClick} />
                      <HorizontalSection title="热门动漫" items={homeSections.anime} id="anime" onItemClick={handleItemClick} />
                  </>
              )}

              {activeTab === 'search' && !currentMovie && (
                  <div className="animate-fade-in max-w-5xl mx-auto py-10">
                      <div className="flex gap-4 mb-12">
                          <form onSubmit={(e) => { e.preventDefault(); triggerSearch(searchQuery); }} className="relative flex-1 group">
                              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-500 group-focus-within:text-brand transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg></div>
                              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="探索大片、剧集或导演..." className="w-full bg-[#0f111a] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-brand/60 focus:ring-4 focus:ring-brand/5 shadow-2xl transition-all font-bold placeholder:text-gray-600" />
                          </form>
                          <button onClick={() => triggerSearch(searchQuery)} className="bg-brand hover:bg-brand-hover text-black font-black px-10 rounded-2xl transition-all shadow-[0_20px_40px_rgba(34,197,94,0.3)]">搜索</button>
                      </div>
                      <div ref={resultsRef}>
                          {loading ? <div className="flex justify-center py-40"><div className="animate-spin h-14 w-14 border-[6px] border-brand border-t-transparent rounded-full shadow-[0_0_20px_rgba(34,197,94,0.2)]"></div></div> : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                  {searchResults.map((item) => (
                                      <div key={item.vod_id} onClick={() => handleItemClick(item)} className="group cursor-pointer bg-[#0f111a] rounded-[1.25rem] overflow-hidden aspect-[2/3] relative border border-white/5 hover:border-brand/60 transition-all duration-500 shadow-2xl hover:-translate-y-2 ring-1 ring-white/10">
                                          <ImageWithFallback src={item.vod_pic || ''} alt={item.vod_name} searchKeyword={item.vod_name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-20">
                                              <h4 className="text-sm lg:text-base font-black text-white truncate group-hover:text-brand transition-colors">{item.vod_name}</h4>
                                              <div className="flex justify-between items-center mt-2 text-[10px] font-black text-gray-500 uppercase tracking-tighter"><span>{item.vod_year || '2025'}</span><span className="bg-white/10 px-2 py-0.5 rounded-full">{item.type_name || 'Movie'}</span></div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              )}
          </div>

          {/* 右键删除菜单 - 极致液态玻璃设计 */}
          {contextMenu.visible && (
              <div 
                  className="fixed z-[100] w-48 bg-slate-900/60 backdrop-blur-[32px] border border-white/20 rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-slide-up ring-1 ring-white/10"
                  style={{ top: contextMenu.y, left: contextMenu.x }}
              >
                  <div className="p-2">
                    <button 
                        onClick={handleDeleteHistory}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group hover:bg-red-500/20"
                    >
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-white group-hover:text-red-400">删除观影记录</span>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Remove Record</span>
                        </div>
                    </button>
                  </div>
              </div>
          )}

          <Suspense fallback={null}><GeminiChat currentMovie={currentMovie} /></Suspense>
          <Suspense fallback={null}><SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} /></Suspense>
      </div>
  );
};

export default App;