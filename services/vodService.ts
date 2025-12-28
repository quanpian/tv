
import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem, VodSource, PlaySource, HistoryItem, PersonDetail, ReviewItem } from '../types';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE SETUP ---
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '';

let supabase: any = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    try { supabase = createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) {}
}

// DEFAULT SOURCE
const DEFAULT_SOURCE: VodSource = {
    id: 'default',
    name: '默认源 (官方)',
    api: 'https://caiji.dyttzyapi.com/api.php/provide/vod',
    active: true,
    canDelete: false
};

const GLOBAL_PROXY = 'https://daili.laidd.de5.net/?url=';
const HISTORY_KEY = 'cine_watch_history';
const SOURCES_KEY = 'cine_vod_sources';
const HOME_CACHE_KEY = 'cine_home_data_v3';
const CAT_CACHE_PREFIX = 'cine_cat_cache_';
const CACHE_TTL = 30 * 60 * 1000;

// --- UTILS ---

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

const fetchWithProxy = async (targetUrl: string, options: RequestInit = {}): Promise<any> => {
  try {
      const proxyUrl = `${GLOBAL_PROXY}${encodeURIComponent(targetUrl)}`;
      const response = await fetchWithTimeout(proxyUrl, options, 12000);
      if (response.ok) {
          const text = await response.text();
          try { return JSON.parse(text); } catch(e) { return text; }
      }
  } catch (e) {}
  return null;
};

const fetchCmsData = async (baseUrl: string, params: URLSearchParams): Promise<any> => {
    params.set('out', 'json');
    const url = `${baseUrl}?${params.toString()}`;
    try {
        const res = await fetchWithTimeout(url, {}, 6000);
        if (res.ok) {
            const text = await res.text();
            try { return JSON.parse(text); } catch (e) {}
        }
    } catch (e) {}
    return await fetchWithProxy(url);
};

// --- CORE LOGIC ---

export const getHomeSections = async () => {
    try {
        const cached = localStorage.getItem(HOME_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) return data;
        }
    } catch (e) {}

    const safeFetch = async (fn: Promise<VodItem[]>) => { try { return await fn; } catch (e) { return []; } };

    const [movies, series, shortDrama, anime, variety] = await Promise.all([
        safeFetch(fetchDoubanJson('movie', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '短剧', 18)), 
        safeFetch(fetchDoubanJson('tv', '日本动画', 18)),
        safeFetch(fetchDoubanJson('tv', '综艺', 18))
    ]);
    
    // 如果首页全都获取失败，尝试用 CMS 数据填充
    let data = { movies, series, shortDrama, anime, variety };
    if (movies.length === 0) {
        const cmsMovies = await searchAllCmsResources('电影');
        data.movies = cmsMovies.slice(0, 18);
    }
    if (series.length === 0) {
        const cmsSeries = await searchAllCmsResources('电视剧');
        data.series = cmsSeries.slice(0, 18);
    }

    if (data.movies.length > 0) {
        localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    }
    return data;
};

/**
 * 强化版的分类获取逻辑
 * 豆瓣优先 -> CMS 兜底
 */
export const fetchCategoryItems = async (category: string, options: any = {}): Promise<VodItem[]> => {
    const { filter1 = '全部', filter2 = '全部', page = 1 } = options;
    const cacheKey = `${CAT_CACHE_PREFIX}${category}_${filter1}_${filter2}_${page}`;
    
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) return data;
        }
    } catch (e) {}

    let type = 'movie', tag = '热门', sort = 'recommend';
    if (category === 'series') type = 'tv';
    if (category === 'variety') { type = 'tv'; tag = '综艺'; }
    if (category === 'anime') { type = 'tv'; tag = '日本动画'; }
    
    if (filter1 !== '全部') tag = filter1;

    // 1. 尝试从豆瓣获取
    let results = await fetchDoubanJson(type, tag, 20, sort, (page - 1) * 20);

    // 2. 如果豆瓣没数据或报错，尝试从资源站获取分类内容
    if (results.length === 0) {
        let keyword = '2024'; // 默认关键词
        if (category === 'movies') keyword = filter2 !== '全部' ? filter2 : '电影';
        else if (category === 'series') keyword = filter2 !== '全部' ? filter2 : '连续剧';
        else if (category === 'anime') keyword = '动漫';
        else if (category === 'variety') keyword = '综艺';

        const cmsItems = await searchAllCmsResources(keyword);
        // 按页面切割
        results = cmsItems.slice((page - 1) * 20, page * 20);
    }

    if (results.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify({ data: results, timestamp: Date.now() }));
    }

    return results;
};

const fetchDoubanJson = async (type: string, tag: string, limit = 18, sort = 'recommend', start = 0): Promise<VodItem[]> => {
    const doubanUrl = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=${sort}&page_limit=${limit}&page_start=${start}`;
    const data = await fetchWithProxy(doubanUrl);
    if (data?.subjects && Array.isArray(data.subjects)) {
        return data.subjects.map((item: any) => ({
            vod_id: item.id,
            vod_name: item.title,
            vod_pic: item.cover || '', 
            vod_score: item.rate,
            type_name: tag,
            source: 'douban',
            vod_year: '2024'
        }));
    }
    return [];
};

export const searchAllCmsResources = async (keyword: string): Promise<VodItem[]> => {
    const sources = getVodSources().filter(s => s.active);
    const promises = sources.map(async (source) => {
        try {
            const data = await fetchCmsData(source.api, new URLSearchParams({ ac: 'detail', wd: keyword }));
            if (data?.list) {
                return data.list.map((item: any) => ({
                    vod_id: `cms_${item.vod_id}`,
                    vod_name: item.vod_name,
                    vod_pic: item.vod_pic,
                    vod_remarks: item.vod_remarks,
                    type_name: item.type_name,
                    vod_year: item.vod_year,
                    api_url: source.api,
                    source: 'cms'
                }));
            }
        } catch(e) {}
        return [];
    });
    const results = await Promise.all(promises);
    const flattened = results.flat();
    
    // 简单的去重
    const seenNames = new Set();
    return flattened.filter(item => {
        if (seenNames.has(item.vod_name)) return false;
        seenNames.add(item.vod_name);
        return true;
    });
};

export const getAggregatedSearch = async (keyword: string): Promise<VodItem[]> => {
    // 搜索也加入豆瓣建议词聚合
    const [doubanSuggest, cmsResults] = await Promise.all([
        searchDouban(keyword),
        searchAllCmsResources(keyword)
    ]);
    
    const finalResults = [...doubanSuggest];
    const existingNames = new Set(doubanSuggest.map(i => i.vod_name));
    
    cmsResults.forEach(item => {
        if (!existingNames.has(item.vod_name)) {
            finalResults.push(item);
            existingNames.add(item.vod_name);
        }
    });
    return finalResults;
};

const searchDouban = async (keyword: string): Promise<VodItem[]> => {
    const data = await fetchWithProxy(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`);
    if (Array.isArray(data)) {
        return data.map((item: any) => ({
            vod_id: item.id,
            vod_name: item.title,
            vod_pic: item.img ? item.img.replace(/s_ratio_poster|m(?=\/public)/, 'l') : '',
            type_name: item.type === 'celebrity' ? 'celebrity' : (item.type || '影视'),
            vod_year: item.year,
            source: 'douban'
        }));
    }
    return [];
};

export const getAggregatedMovieDetail = async (id: number | string, apiUrl?: string, vodName?: string): Promise<{ main: VodDetail, alternatives: VodDetail[] } | null> => {
    const realId = String(id).replace('cms_', '');
    let mainDetail = await getMovieDetail(realId, apiUrl);
    
    if (!mainDetail && vodName) {
        const sources = getVodSources().filter(s => s.active);
        for (const s of sources) {
            try {
                const data = await fetchCmsData(s.api, new URLSearchParams({ ac: 'detail', wd: vodName }));
                const exact = data?.list?.find((v: any) => v.vod_name === vodName);
                if (exact) { exact.api_url = s.api; mainDetail = exact; break; }
            } catch(e) {}
        }
    }
    
    if (!mainDetail) return null;
    return { main: mainDetail, alternatives: [] };
};

export const getMovieDetail = async (id: number | string, apiUrl?: string): Promise<VodDetail | null> => {
    const sources = apiUrl ? [{ api: apiUrl }] : getVodSources().filter(s => s.active);
    for (const source of sources) {
        try {
            const data = await fetchCmsData(source.api, new URLSearchParams({ ac: 'detail', ids: id.toString() }));
            if (data?.list?.[0]) { data.list[0].api_url = source.api; return data.list[0]; }
        } catch(e) {}
    }
    return null;
};

export const parseAllSources = (input: VodDetail | VodDetail[]): PlaySource[] => {
    const details = Array.isArray(input) ? input : [input];
    const all: PlaySource[] = [];
    details.forEach(d => {
        if (!d.vod_play_url) return;
        const froms = d.vod_play_from.split('$$$');
        const urls = d.vod_play_url.split('$$$');
        froms.forEach((f, i) => {
            if (!f.toLowerCase().includes('m3u8')) return;
            const eps = urls[i].split('#').map((l, idx) => {
                const parts = l.split('$');
                const title = parts.length > 1 ? parts[0] : `第${idx+1}集`;
                const url = parts.length > 1 ? parts[1] : parts[0];
                return { title, url, index: idx };
            }).filter(ep => ep.url && (ep.url.startsWith('http') || ep.url.startsWith('//')));
            if (eps.length > 0) all.push({ name: f, episodes: eps });
        });
    });
    return all;
};

export const fetchDoubanData = async (keyword: string, doubanId?: string | number): Promise<any | null> => {
  try {
    let targetId = doubanId;
    if (!targetId || targetId === '0') {
        const data = await fetchWithProxy(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`);
        if (Array.isArray(data) && data.length > 0) targetId = data[0].id;
    }
    if (!targetId) return null;
    const html = await fetchWithProxy(`https://movie.douban.com/subject/${targetId}/`);
    if (typeof html !== 'string') return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return {
        doubanId: String(targetId),
        score: doc.querySelector('.ll.rating_num')?.textContent?.trim(),
        content: doc.querySelector('span[property="v:summary"]')?.textContent?.trim(),
        pic: doc.querySelector('#mainpic img')?.getAttribute('src'),
        director: doc.querySelector('a[rel="v:directedBy"]')?.textContent?.trim(),
        actor: Array.from(doc.querySelectorAll('a[rel="v:starring"]')).slice(0, 5).map(a => a.textContent).join(' / ')
    };
  } catch (e) { return null; }
};

export const getHistory = (): HistoryItem[] => {
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch(e) { return []; }
};

export const addToHistory = (item: HistoryItem) => {
    let h = getHistory().filter(x => String(x.vod_id) !== String(item.vod_id));
    h.unshift(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 20)));
    return h;
};

export const removeFromHistory = (id: string | number) => {
    let h = getHistory().filter(x => String(x.vod_id) !== String(id));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    return h;
};

export const getVodSources = (): VodSource[] => {
    try {
        const stored = localStorage.getItem(SOURCES_KEY);
        return stored ? JSON.parse(stored) : [DEFAULT_SOURCE];
    } catch(e) { return [DEFAULT_SOURCE]; }
};

export const initVodSources = async () => {
    if (!supabase) return;
    try {
        const { data } = await supabase.from('cine_sources').select('*').order('created_at', { ascending: true });
        if (data) {
            const cloudSources = data.map((d: any) => ({ id: d.id, name: d.name, api: d.api, active: d.active, canDelete: true }));
            const combined = [DEFAULT_SOURCE, ...cloudSources.filter(cs => cs.api !== DEFAULT_SOURCE.api)];
            localStorage.setItem(SOURCES_KEY, JSON.stringify(combined));
        }
    } catch (e) {}
};

export const saveVodSources = (s: VodSource[]) => localStorage.setItem(SOURCES_KEY, JSON.stringify(s));
export const clearAppCache = () => { localStorage.clear(); window.location.reload(); };
export const getDoubanPoster = async (k: string) => null;
export const fetchPersonDetail = async (id: any) => null;
export const addVodSource = async (n: string, a: string) => null;
export const deleteVodSource = async (id: any) => {};
export const resetVodSources = async () => [DEFAULT_SOURCE];
