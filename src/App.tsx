
import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
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
    Movie: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125 1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 5.496 4.5 4.875 4.5M6 9.375c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125V8.625c0-.621-.504-1.125-1.125-1.125h-1.5M6 9.375v5.25m0-5.25C6 8.754 5.496 8.25 4.875 8.25M6 14.625c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125h-1.5" /></svg>,
    Series: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" /></svg>,
    Anime: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>,
    Variety: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
    Settings: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>
};

const URL_TO_TAB: Record<string, string> = { '': 'home', 'dianying': 'movies', 'dianshiju': 'series', 'dongman': 'anime', 'zongyi': 'variety', 'sousuo': 'search' };
const TAB_TO_URL: Record<string, string> = { 'home': '/', 'movies': '/dianying', 'series': '/dianshiju', 'anime': '/dongman', 'variety': '/zongyi', 'search': '/sousuo' };
const TAB_NAME: Record<string, string> = { 'home': '首页', 'movies': '电影', 'series': '剧集', 'anime': '动漫', 'variety': '综艺', 'search': '搜索' };

const HeroBanner = React.memo(({ items, onPlay }: { items: VodItem[], onPlay: (item: VodItem) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detail, setDetail] = useState<any>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => { handleNext(); }, 8000); 
    return () => clearInterval(interval);
  }, [currentIndex, items.length]);

  useEffect(() => {
      if (items && items.length > 0) {
          const item = items[currentIndex];
          setDetail(null);
          fetchDoubanData(item.vod_name, item.vod_id).then(res => { if (res) setDetail(res); });
      }
  }, [currentIndex, items]);

  const handleNext = useCallback(() => { setCurrentIndex((prev) => (prev + 1) % items.length); }, [items.length]);
  const handlePrev = useCallback(() => { setCurrentIndex((prev) => (prev - 1 + items.length) % items.length); }, [items.length]);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) handleNext(); else if (distance < -50) handlePrev();
    setTouchStart(0); setTouchEnd(0);
  };

  if (!items || items.length === 0) return null;
  const activeItem = items[currentIndex];

  return (
    <div className="relative w-full h-[210px] md:h-[380px] rounded-2xl md:rounded-3xl overflow-hidden mb-8 md:mb-12 group shadow-2xl bg-[#0a0a0a] touch-pan-y border border-white/5" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div key={activeItem.vod_id + '_bg'} className="absolute inset-0 animate-fade-in transition-all duration-700">
          <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="l" className="w-full h-full object-cover blur-md opacity-40 scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-transparent z-0"></div>
      </div>
      <div key={activeItem.vod_id + '_content'} className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="container mx-auto px-4 md:px-12 w-full h-full flex items-center">
            <div className="flex flex-row items-center gap-4 md:gap-10 w-full animate-slide-up">
                <div className="flex-shrink-0 w-[90px] md:w-[160px] aspect-[2/3] rounded-lg md:rounded-xl overflow-hidden shadow-2xl border border-white/20 relative z-20 hover:scale-105 transition-transform duration-500 bg-black">
                    <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="l" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-left space-y-1.5 md:space-y-4 flex flex-col items-start justify-center min-w-0">
                    <div className="flex flex-wrap items-center justify-start gap-1.5 md:gap-2">
                        <span className="bg-brand text-black text-[10px] md:text-xs font-black px-1.5 py-0.5 rounded uppercase tracking-wider">{detail?.score || activeItem.vod_score || 'HOT'}</span>
                        <span className="bg-white/10 border border-white/10 text-gray-200 text-[10px] md:text-xs font-medium px-1.5 py-0.5 rounded backdrop-blur-md">{activeItem.vod_year || '2025'}</span>
                        <span className="bg-white/10 border border-white/10 text-gray-200 text-[10px] md:text-xs font-medium px-1.5 py-0.5 rounded backdrop-blur-md">{activeItem.type_name || detail?.type_name || '精选'}</span>
                    </div>
                    <h2 className="text-xl md:text-4xl font-black text-white leading-tight drop-shadow-xl tracking-tight line-clamp-2">{activeItem.vod_name}</h2>
                    <div className="text-gray-300 text-[10px] md:text-sm font-medium line-clamp-1 opacity-90">{detail?.director && <span className="mr-2">导演: {detail.director}</span>}{detail?.actor && <span>主演: {detail.actor}</span>}</div>
                    <p className="text-gray-400 text-[10px] md:text-sm leading-relaxed line-clamp-2 md:line-clamp-3 drop-shadow-md max-w-2xl hidden xs:block">{detail?.content ? detail.content.replace(/<[^>]+>/g, '') : (activeItem.vod_remarks || "精彩内容即将呈现...")}</p>
                    <div className="pt-1 md:pt-2 flex flex-row gap-2 md:gap-4">
                        <button onClick={() => onPlay(activeItem)} className="bg-white text-black hover:bg-brand hover:text-black text-xs md:text-base font-bold px-4 py-1.5 md:px-8 md:py-3 rounded-full flex items-center gap-1 md:gap-2 transition-all hover:scale-105 shadow-lg active:scale-95 whitespace-nowrap">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>
                            <span>立即观影</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
      <div className="absolute bottom-3 md:bottom-5 left-1/2 transform -translate-x-1/2 flex gap-2.5 z-20">
          {items.map((_, idx) => ( <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }} className={`h-1 md:h-1.5 rounded-full transition-all duration-500 ${idx === currentIndex ? 'bg-brand w-6 md:w-10' : 'bg-white/20 w-1.5 md:w-2 hover:bg-white/50'}`} /> ))}
      </div>
    </div>
  );
});

const HorizontalSection = React.memo(({ title, items, id, onItemClick, onItemContextMenu, onLoadMore, hasMore }: { title: string, items: (VodItem | HistoryItem)[], id: string, onItemClick: (item: VodItem) => void, onItemContextMenu?: (e: React.MouseEvent, item: VodItem) => void, onLoadMore?: () => void, hasMore?: boolean }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!onLoadMore || !hasMore) return;
        const observer = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting) onLoadMore(); },
            { root: scrollRef.current, threshold: 0.1 }
        );
        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [onLoadMore, hasMore, items.length]);

    if (!items || items.length === 0) return null;
    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -current.clientWidth * 0.8 : current.clientWidth * 0.8;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };
    return (
        <div className="mb-10 animate-fade-in group/section cv-auto" id={id}>
            <div className="flex justify-between items-end mb-5 px-1">
                <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5 border-l-4 border-brand pl-4 tracking-tight">{title}</h3>
            </div>
            <div className="relative group">
                 <button className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-brand text-white p-2.5 rounded-full opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex border border-white/10 shadow-xl -ml-5" onClick={() => scroll('left')}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <div ref={scrollRef} className="flex gap-4 md:gap-6 overflow-x-auto pb-6 no-scrollbar snap-x scroll-smooth">
                    {items.map((item) => (
                        <div key={`${item.vod_id}-${(item as HistoryItem).last_updated || ''}`} className="flex-shrink-0 w-[140px] md:w-[190px] snap-start cursor-pointer relative group/card" onClick={() => onItemClick(item)} onContextMenu={(e) => onItemContextMenu && onItemContextMenu(e, item)}>
                            <div className="aspect-[2/3] rounded-xl overflow-hidden relative shadow-lg bg-slate-900 border border-white/5 group-hover/card:border-brand/40 transition-all duration-500">
                                <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} size="m" className="w-full h-full object-cover transform group-hover/card:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/30 transition-colors duration-500"></div>
                                {(item as any).vod_remarks && <div className="absolute top-2 right-2 bg-black/70 text-[10px] font-bold text-white px-2 py-0.5 rounded-md backdrop-blur-md border border-white/10">{(item as any).vod_remarks}</div>}
                                {(item as any).vod_score && <div className="absolute bottom-2 right-2 text-brand font-black text-xs drop-shadow-2xl">{(item as any).vod_score}</div>}
                                {(item as HistoryItem).episode_name && ( <div className="absolute bottom-0 left-0 right-0 bg-brand/95 text-black text-[10px] font-black px-2 py-1.5 text-center truncate">上次: {(item as HistoryItem).episode_name}</div> )}
                            </div>
                            <h4 className="mt-3 text-sm text-gray-200 font-bold line-clamp-2 group-hover:text-brand transition-colors px-1 leading-snug">{item.vod_name}</h4>
                        </div>
                    ))}
                    {hasMore && <div ref={sentinelRef} className="flex-shrink-0 w-[140px] md:w-[190px] flex items-center justify-center bg-white/5 rounded-xl border border-dashed border-white/10 text-gray-500 font-black text-xs">加载更多...</div>}
                </div>
                <button className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-brand text-white p-2.5 rounded-full opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex border border-white/10 shadow-xl -mr-5" onClick={() => scroll('right')}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
            </div>
        </div>
    );
});

const CategoryPage = ({ category, onPlay }: { category: string, onPlay: (item: VodItem) => void }) => {
    const [items, setItems] = useState<VodItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [filter1, setFilter1] = useState('全部');
    const [filter2, setFilter2] = useState('全部');
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const config = useMemo(() => {
        switch(category) {
            case 'movies': return { title: '电影', sub: '来自豆瓣的精选内容', f1: ['全部', '热门电影', '最新电影', '豆瓣高分', '冷门佳片'], f2Label: '地区', f2: ['全部', '华语', '欧美', '韩国', '日本'] };
            case 'series': return { title: '电视剧', sub: '来自豆瓣的精选内容', f1: ['全部', '最近热门'], f2Label: '类型', f2: ['全部', '国产', '欧美', '日本', '韩国', '动漫', '纪录片'] };
            case 'anime': return { title: '动漫', sub: '来自 Bangumi 番组计划的精选内容', f1: ['每日放送', '番剧', '剧场版'], f2Label: '星期', f2: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] };
            case 'variety': return { title: '综艺', sub: '来自豆瓣的精选内容', f1: ['全部', '最近热门'], f2Label: '类型', f2: ['全部', '国内', '国外'] };
            default: return { title: '频道', sub: '', f1: [], f2Label: '', f2: [] };
        }
    }, [category]);

    const loadData = useCallback(async (reset = false) => {
        if (loading) return;
        setLoading(true);
        const curPage = reset ? 1 : page;
        try {
            const res = await fetchCategoryItems(category, { filter1, filter2, page: curPage });
            if (reset) {
                setItems(res);
                setPage(2);
            } else {
                setItems(prev => [...prev, ...res]);
                setPage(prev => prev + 1);
            }
            setHasMore(res.length >= 18);
        } catch (e) {} finally {
            setLoading(false);
        }
    }, [category, filter1, filter2, page, loading]);

    useEffect(() => { loadData(true); }, [category, filter1, filter2]);

    useEffect(() => {
        if (!hasMore || loading) return;
        const observer = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting) loadData(); },
            { threshold: 0.1 }
        );
        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadData]);

    return (
        <div className="animate-fade-in space-y-8">
            <header className="px-1">
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{config.title}</h1>
                <p className="text-gray-500 font-bold">{config.sub}</p>
            </header>

            <section className="bg-white/5 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 ring-1 ring-blue-500/10 shadow-3xl">
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-gray-500 font-bold text-sm flex-shrink-0">分类</span>
                    <div className="flex gap-2">
                        {config.f1.map(f => (
                            <button key={f} onClick={() => setFilter1(f)} className={`px-5 py-2 rounded-2xl text-sm font-black transition-all whitespace-nowrap ${filter1 === f ? 'bg-white/10 text-brand ring-1 ring-brand/40' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>{f}</button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                    <span className="text-gray-500 font-bold text-sm flex-shrink-0">{config.f2Label}</span>
                    <div className="flex gap-2">
                        {config.f2.map(f => (
                            <button key={f} onClick={() => setFilter2(f)} className={`px-5 py-2 rounded-2xl text-sm font-black transition-all whitespace-nowrap ${filter2 === f ? 'bg-white/10 text-brand ring-1 ring-brand/40' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>{f}</button>
                        ))}
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {items.map((item) => (
                    <div key={item.vod_id} onClick={() => onPlay(item)} className="group cursor-pointer bg-[#0f111a] rounded-2xl overflow-hidden aspect-[2/3] relative border border-white/5 hover:border-brand/60 transition-all duration-500 shadow-2xl hover:-translate-y-2 ring-1 ring-white/10 flex flex-col">
                        <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} size="m" className="w-full aspect-[2/3] object-cover transition-transform duration-1000 group-hover:scale-110" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-16 mt-auto">
                            <h4 className="text-sm font-black text-white line-clamp-1 group-hover:text-brand transition-colors">{item.vod_name}</h4>
                            <div className="flex justify-between items-center mt-2 text-[10px] font-black text-gray-500 uppercase">
                                <span>{item.vod_year || '2025'}</span>
                                <span className="text-brand">{item.vod_score || ''}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div ref={sentinelRef} className="flex justify-center py-10 min-h-[100px]">
                {loading && <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full shadow-2xl"></div>}
                {!hasMore && items.length > 0 && <span className="text-gray-600 font-black text-xs uppercase tracking-widest opacity-40">已探索全宇宙</span>}
            </div>
        </div>
    );
};

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
  const [homeSections, setHomeSections] = useState<any>({ movies: [], series: [], shortDrama: [], anime: [], variety: [] });
  const [heroItems, setHeroItems] = useState<VodItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>([]);
  
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, item: VodItem | null }>({ visible: false, x: 0, y: 0, item: null });

  useEffect(() => {
    const SITE_NAME = 'CineStream AI';
    let title = `${SITE_NAME} - 免费高清影视聚合平台 | 智能P2P加速秒播`;
    let description = 'CineStream AI为您提供最新最全的高清电影、电视剧、动漫和综艺在线观看。采用先进P2P加速技术，极致观影体验。';
    
    if (currentMovie) {
        const movieName = currentMovie.vod_name;
        const episodeName = episodes[currentEpisodeIndex]?.title || '';
        title = `《${movieName}》${episodeName}_高清在线观看 - ${SITE_NAME}`;
    }

    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
  }, [currentMovie, activeTab, searchQuery, currentEpisodeIndex, episodes]);

  useEffect(() => { initVodSources(); setWatchHistory(getHistory()); }, []);

  useEffect(() => {
    const handleGlobalClick = () => { if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false }); };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleGlobalClick, true);
    return () => { window.removeEventListener('click', handleGlobalClick); window.removeEventListener('scroll', handleGlobalClick, true); };
  }, [contextMenu.visible]);

  useEffect(() => {
       setLoading(true);
       getHomeSections().then(initialData => {
           if (initialData) {
               setHomeSections(initialData);
               const allItems = [ ...initialData.movies, ...initialData.series, ...initialData.anime ];
               setHeroItems(allItems.slice(0, 15));
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
          setHasSearched(activeTab === 'search');
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
                  const initialIndex = allSources.findIndex(s => s.name.toLowerCase().includes('m3u8')) >= 0 ? allSources.findIndex(s => s.name.toLowerCase().includes('m3u8')) : 0;
                  setCurrentSourceIndex(initialIndex);
                  setEpisodes(allSources[initialIndex].episodes);
                  setCurrentMovie(main);
                  const savedIndex = parseInt(localStorage.getItem(`cine_last_episode_${main.vod_id}`) || '0');
                  setCurrentEpisodeIndex((!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < allSources[initialIndex].episodes.length) ? savedIndex : 0);
              }
          }
      } catch (error) {} finally { setLoading(false); }
  };

  const handleItemClick = (item: VodItem) => {
      if (item.type_name === 'celebrity') {
        setLoading(true);
        fetchPersonDetail(item.vod_id).then(detail => {
            if (detail) { setPersonProfile(detail); setSearchResults(detail.works || []); }
            setLoading(false);
        });
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

  const NavBar = ({ activeTab, onTabChange, onSettingsClick }: any) => {
    const navItems = [ 
        { id: 'home', label: '首页', icon: NavIcons.Home }, 
        { id: 'movies', label: '电影', icon: NavIcons.Movie }, 
        { id: 'series', label: '剧集', icon: NavIcons.Series }, 
        { id: 'anime', label: '动漫', icon: NavIcons.Anime }, 
        { id: 'variety', label: '综艺', icon: NavIcons.Variety }, 
        { id: 'search', label: '搜索', icon: NavIcons.Search } 
    ];
    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/90 backdrop-blur-3xl border-b border-white/5 hidden lg:block">
                <div className="container mx-auto max-w-[1400px]">
                    <div className="flex items-center justify-between h-16 px-6">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('home')}><div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-black font-black">C</div><span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400 tracking-tighter">CineStream</span></div>
                        <div className="flex items-center gap-1">
                            {navItems.map(item => ( <button key={item.id} onClick={() => onTabChange(item.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black transition-all duration-300 ${activeTab === item.id ? 'bg-brand text-black shadow-2xl' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>{item.icon}{item.label}</button> ))}
                        </div>
                        <button onClick={onSettingsClick} className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all">{NavIcons.Settings}</button>
                    </div>
                </div>
            </nav>
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-2xl h-14 flex items-center justify-between px-5 border-b border-white/5">
                <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400 tracking-tighter">CineStream</span>
                <button onClick={onSettingsClick} className="text-gray-400 hover:text-white p-1.5 transition-all">{NavIcons.Settings}</button>
            </header>
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f111a]/95 backdrop-blur-2xl border-t border-white/5 safe-area-bottom">
                <div className="grid grid-cols-6 h-16">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => onTabChange(item.id)} className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === item.id ? 'text-brand' : 'text-gray-500'}`}>
                            <div className={`${activeTab === item.id ? 'scale-110' : 'scale-100'}`}>{item.icon}</div>
                            <span className="text-[10px] font-black">{item.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </>
    );
  };

  return (
      <div className="relative min-h-screen pb-24 lg:pb-16 overflow-x-hidden pt-14 lg:pt-20">
          <NavBar activeTab={activeTab} onTabChange={(tab: string) => navigate(TAB_TO_URL[tab])} onSettingsClick={() => setShowSettings(true)} />
          <Suspense fallback={null}><SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} /></Suspense>
          
          <div className="relative z-10 container mx-auto px-4 lg:px-10 py-4 max-w-[1600px]">
              {currentMovie && (
                  <section className="mb-12 animate-fade-in space-y-6">
                      <div className="flex flex-col lg:flex-row gap-0 items-stretch bg-[#0f111a] rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-3xl relative ring-1 ring-white/10">
                          <div className={`flex-1 min-w-0 bg-black relative group transition-all duration-700 z-10 ${!showSidePanel ? 'lg:h-[720px]' : 'lg:h-[550px] h-auto aspect-video'}`}>
                              <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center animate-pulse"><div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>}>
                                  <VideoPlayer url={availableSources[currentSourceIndex]?.episodes[currentEpisodeIndex]?.url || ''} poster={currentMovie.vod_pic} title={currentMovie.vod_name} episodeIndex={currentEpisodeIndex} vodId={currentMovie.vod_id} onNext={() => currentEpisodeIndex < episodes.length - 1 && setCurrentEpisodeIndex(prev => prev + 1)} />
                              </Suspense>
                              {!showSidePanel && (
                                  <div className="absolute top-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
                                      <button onClick={() => setShowSidePanel(true)} className="flex items-center gap-3 px-8 py-4 rounded-full bg-brand text-black font-black shadow-2xl hover:bg-white hover:scale-110 transition-all text-sm tracking-widest uppercase">展开选集</button>
                                  </div>
                              )}
                          </div>
                          {showSidePanel && (
                              <div className="w-full lg:w-[380px] flex flex-col border-l border-white/10 bg-[#0f111a]/80 backdrop-blur-3xl relative z-0 h-[450px] lg:h-auto">
                                  <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/40">
                                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div><h3 className="text-xs font-black text-white tracking-widest uppercase">Playing Now</h3></div>
                                      <button onClick={() => setShowSidePanel(false)} className="px-4 py-1.5 rounded-full text-[10px] font-black text-gray-400 border border-white/10 hover:text-white hover:bg-white/5 transition-all">隐藏面板</button>
                                  </div>
                                  <div className="flex bg-black/20">
                                      <button onClick={() => setSidePanelTab('episodes')} className={`flex-1 py-4 text-[11px] font-black tracking-widest uppercase transition-all relative ${sidePanelTab === 'episodes' ? 'text-brand' : 'text-gray-500'}`}>选集{sidePanelTab === 'episodes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"></div>}</button>
                                      <button onClick={() => setSidePanelTab('sources')} className={`flex-1 py-4 text-[11px] font-black tracking-widest uppercase transition-all relative ${sidePanelTab === 'sources' ? 'text-brand' : 'text-gray-500'}`}>播放源{sidePanelTab === 'sources' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"></div>}</button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-black/10">
                                      {sidePanelTab === 'episodes' ? ( <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-3">{episodes.map((ep) => ( <button key={ep.index} onClick={() => setCurrentEpisodeIndex(ep.index)} className={`h-11 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center relative overflow-hidden ${currentEpisodeIndex === ep.index ? 'bg-brand text-black border-brand' : 'bg-white/5 text-gray-400 border-white/5 hover:border-brand/30 hover:text-brand'}`} title={ep.title}>{ep.title.replace('第', '').replace('集', '')}</button> ))}</div> ) : ( <div className="space-y-3">{availableSources.map((source, idx) => ( <button key={idx} onClick={() => { setCurrentSourceIndex(idx); setEpisodes(source.episodes); setSidePanelTab('episodes'); }} className={`w-full text-left p-4 rounded-2xl border transition-all flex justify-between items-center group ${currentSourceIndex === idx ? 'bg-brand/10 border-brand/40 text-brand' : 'bg-white/5 border-white/5 text-gray-400'}`}><div className="min-w-0"><div className={`font-black text-xs mb-1 truncate ${currentSourceIndex === idx ? 'text-brand' : 'text-gray-200'}`}>{source.name}</div><div className="text-[10px] font-bold opacity-60 uppercase">{source.episodes.length} Episodes</div></div>{currentSourceIndex === idx ? ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> ) : ( <div className="w-2 h-2 rounded-full bg-white/10"></div> )}</button> ))}</div> )}
                                  </div>
                              </div>
                          )}
                      </div>
                      <MovieInfoCard movie={currentMovie} onSearch={triggerSearch} />
                      <Suspense fallback={null}><GeminiChat currentMovie={currentMovie} /></Suspense>
                  </section>
              )}

              {activeTab === 'home' && !currentMovie && (
                  <div className="space-y-4">
                      {heroItems.length > 0 && <HeroBanner items={heroItems} onPlay={handleItemClick} />}
                      {watchHistory.length > 0 && <HorizontalSection title="继续观看" items={watchHistory} id="history" onItemClick={handleItemClick} onItemContextMenu={(e, item) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item }); }} />}
                      <HorizontalSection title="热门电影" items={homeSections.movies} id="movies" onItemClick={handleItemClick} />
                      <HorizontalSection title="热播剧集" items={homeSections.series} id="series" onItemClick={handleItemClick} />
                      <HorizontalSection title="精选综艺" items={homeSections.variety} id="variety" onItemClick={handleItemClick} />
                      <HorizontalSection title="热门动漫" items={homeSections.anime} id="anime" onItemClick={handleItemClick} />
                  </div>
              )}

              {['movies', 'series', 'anime', 'variety'].includes(activeTab) && !currentMovie && (
                  <CategoryPage category={activeTab} onPlay={handleItemClick} />
              )}

              {activeTab === 'search' && !currentMovie && (
                  <div className="animate-fade-in max-w-5xl mx-auto py-6">
                      <div className="flex gap-4 mb-10">
                          <form onSubmit={(e) => { e.preventDefault(); triggerSearch(searchQuery); }} className="relative flex-1">
                              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg></div>
                              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="寻找精彩影视、导演或演员..." className="w-full bg-[#0f111a] border border-white/10 rounded-2xl py-4 lg:py-5 pl-14 pr-6 text-white text-base focus:border-brand/60 focus:ring-4 focus:ring-brand/5 shadow-2xl transition-all font-bold placeholder:text-gray-600" />
                          </form>
                          <button onClick={() => triggerSearch(searchQuery)} className="bg-brand hover:bg-brand-hover text-black font-black px-10 rounded-2xl transition-all active:scale-95 shadow-xl text-base">搜索</button>
                      </div>
                      <div ref={resultsRef}>
                          {loading ? <div className="flex justify-center py-40"><div className="animate-spin h-14 w-14 border-[6px] border-brand border-t-transparent rounded-full shadow-2xl"></div></div> : (
                              <>
                                  {searchResults.length > 0 ? (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                          {searchResults.map((item) => (
                                              <div key={item.vod_id} onClick={() => handleItemClick(item)} className="group cursor-pointer bg-[#0f111a] rounded-2xl overflow-hidden aspect-[2/3] relative border border-white/5 hover:border-brand/60 transition-all duration-500 shadow-2xl hover:-translate-y-2 ring-1 ring-white/10 flex flex-col">
                                                  <ImageWithFallback src={item.vod_pic || ''} alt={item.vod_name} searchKeyword={item.vod_name} className="w-full aspect-[2/3] object-cover transition-transform duration-1000 group-hover:scale-110" />
                                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-16 mt-auto">
                                                      <h4 className="text-sm lg:text-base font-black text-white line-clamp-1 group-hover:text-brand transition-colors">{item.vod_name}</h4>
                                                      <div className="flex justify-between items-center mt-2 text-[10px] font-black text-gray-500 uppercase"><span>{item.vod_year || '2025'}</span><span className="bg-white/10 px-2 py-0.5 rounded-full">{item.type_name || 'Movie'}</span></div>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (hasSearched && <div className="text-center py-40 text-gray-600 font-bold text-xl">未探索到相关内容</div>)}
                              </>
                          )}
                      </div>
                  </div>
              )}
          </div>
      </div>
  );
};

export default App;
