import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Artplayer from 'artplayer';
import artplayerPluginDanmuku from 'artplayer-plugin-danmuku';
import Hls from 'hls.js';
import P2PEngine from 'swarmcloud-hls';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  autoplay?: boolean;
  onEnded?: () => void;
  onNext?: () => void;
  title?: string;
  episodeIndex?: number;
  doubanId?: string;
}

// Icons for settings
const ICONS = {
    skipStart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 4h2v16H5V4zm4 1v14l11-7L9 5z"/></svg>',
    skipEnd: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 5l11 7-11 7V5zm12-1h2v16h-2V4z"/></svg>',
    airPlay: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 22h12l-6-6zM21 3H3c-1.1 0-2 .9-2 2v12h2V5h18v12h2V5c0-1.1-.9-2-2-2z"/></svg>',
    chromecast: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.92-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>',
    danmaku: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    next: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>'
};

const SKIP_OPTIONS = [
    { html: '关闭', value: 0 },
    { html: '30秒', value: 30 },
    { html: '45秒', value: 45 },
    { html: '60秒', value: 60 },
    { html: '90秒', value: 90 },
    { html: '120秒', value: 120 },
    { html: '150秒', value: 150 },
    { html: '180秒', value: 180 },
];

const AD_PATTERNS = [
    'googleads', 'doubleclick', '/ad/', 'ad_', '.m3u8_ad', 
    'advertisement', 'ignore=', 'guanggao', 'hecheng', 
    '666666', '555555', '999999', 'hl_ad', 'm3u8_ad', 
    '/tp/ad', 'cs.html', '111111', '222222', '333333', 
    '444444', '777777', '888888', '000000', 'yibo', 'daohang',
    'aybc', 'qq2', 'hls_ad', 'm3u8_a', '989898', '777999', 
    'ts_ad', 'ad.ts', 'ad_0', 'ad_1', 'ad_2', 'xiaoshuo',
    'wangzhuan', 'gif', '.mp4'
];

function filterAdsFromM3U8(m3u8Content: string): string {
    if (!m3u8Content) return '';
    const lines = m3u8Content.split('\n');
    const filteredLines: string[] = [];
    let inAdBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('EXT-X-CUE-OUT') || line.includes('SCTE35') || (line.includes('DATERANGE') && line.includes('SCTE35'))) { 
            inAdBlock = true; 
            continue; 
        }
        if (line.includes('EXT-X-CUE-IN')) { 
            inAdBlock = false; 
            continue; 
        }
        if (line.includes('EXT-X-DISCONTINUITY')) {
            continue;
        }
        if (inAdBlock) continue;
        if (line && !line.startsWith('#')) {
             const lowerUrl = line.toLowerCase();
             if (AD_PATTERNS.some(p => lowerUrl.includes(p))) {
                 if (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].includes('#EXTINF')) {
                     filteredLines.pop();
                 }
                 continue;
             }
        }
        filteredLines.push(lines[i]);
    }
    return filteredLines.join('\n');
}

// ================= API Configuration =================
const DANMAKU_API_BASE = 'https://dm1.laidd.de5.net/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';
const API_SEARCH_EPISODES = `${DANMAKU_API_BASE}/api/v2/search/episodes`;
const API_MATCH = `${DANMAKU_API_BASE}/api/v2/match`;
const API_SEARCH_ANIME = `${DANMAKU_API_BASE}/api/v2/search/anime`;
const API_COMMENT = `${DANMAKU_API_BASE}/api/v2/comment`;

// Robust Fetch with Multiple Proxies
const robustFetch = async (url: string, options: RequestInit = {}) => {
    const strategies = [
        // 1. Direct fetch (fastest if CORS allowed)
        async () => {
            const res = await fetch(url, { ...options, referrerPolicy: 'no-referrer' });
            if (!res.ok) throw new Error(`Direct fetch failed: ${res.status}`);
            return res;
        },
        // 2. CorsProxy.io
        async () => {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl, options);
            if (!res.ok) throw new Error(`CorsProxy failed: ${res.status}`);
            return res;
        },
        // 3. AllOrigins (JSON wrapper for text/raw)
        async () => {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl, options);
            if (!res.ok) throw new Error(`AllOrigins failed: ${res.status}`);
            return res;
        },
        // 4. ThingProxy
        async () => {
            const proxyUrl = `https://thingproxy.freeboard.io/fetch/${url}`;
            const res = await fetch(proxyUrl, options);
            if (!res.ok) throw new Error(`ThingProxy failed: ${res.status}`);
            return res;
        },
        // 5. CodeTabs
        async () => {
            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl, options);
            if (!res.ok) throw new Error(`CodeTabs failed: ${res.status}`);
            return res;
        }
    ];

    let lastError;
    for (const strategy of strategies) {
        try {
            return await strategy();
        } catch (e) {
            lastError = e;
            // console.warn('Fetch strategy failed, trying next...', e);
        }
    }
    throw lastError || new Error('All fetch strategies failed');
};

const transformDanmaku = (comments: any[]) => {
    if (!Array.isArray(comments)) return [];
    console.log(`[Danmaku] Transforming ${comments.length} comments.`);
    return comments.map((item: any) => {
        // DandanPlay format p="time,mode,color,cid"
        const p = (item.p || '').split(',');
        const time = parseFloat(p[0]) || 0;
        const modeId = parseInt(p[1]) || 1;
        const colorInt = parseInt(p[2]) || 16777215;
        
        let mode = 0; // 0: Scroll (Artplayer default)
        if (modeId === 4) mode = 2; // Bottom
        else if (modeId === 5) mode = 1; // Top
        
        const colorHex = (colorInt & 0xFFFFFF).toString(16).padStart(6, '0');
        
        return {
            text: item.m || '',
            time: time,
            mode: mode, 
            color: '#' + colorHex,
            border: true,
        };
    }).filter(item => item.text);
};

const fetchDanmaku = async (title: string, episodeIndex: number, videoUrl: string) => {
    if (!title) return [];
    
    // Clean Title: remove season, year, keywords to get the core name
    const cleanTitle = title
        .replace(/第\s*\d+\s*季|Season\s*\d+|S\d+/gi, '')
        .replace(/\(\d{4}\)/g, '')
        .replace(/电视剧|动漫|综艺|movie|tv/gi, '')
        .trim();
    
    const episodeNum = episodeIndex + 1;
    console.log(`[Danmaku] Starting Waterfall Search for: "${cleanTitle}" Ep${episodeNum}`);

    let episodeId: number | null = null;

    // --- Strategy 1: Search Episodes (Prioritize Precise Matching) ---
    try {
        console.log('[Danmaku] Strategy 1: Search Episodes');
        const searchUrl = `${API_SEARCH_EPISODES}?anime=${encodeURIComponent(cleanTitle)}`;
        const res = await robustFetch(searchUrl);
        const data = await res.json();
        
        if (data.animes && Array.isArray(data.animes)) {
            const scoredAnimes = data.animes.map((anime: any) => {
                let score = 0;
                const animeTitle = (anime.animeTitle || '').toLowerCase();
                const targetTitle = cleanTitle.toLowerCase();

                if (animeTitle === targetTitle) score += 100;
                else if (animeTitle.includes(targetTitle)) score += 50;
                
                if (anime.episodes && anime.episodes.length > episodeIndex) score += 20;
                
                if (animeTitle.match(/第[二三四五]季|Season\s*[2-9]/) && !title.match(/第[二三四五]季|Season\s*[2-9]/)) {
                    score -= 30;
                }
                return { ...anime, score };
            }).sort((a: any, b: any) => b.score - a.score);

            for (const anime of scoredAnimes) {
                if (!anime.episodes || anime.episodes.length === 0) continue;

                // Regex patterns
                const regexes = [
                    /(?:第|EP|E|Vol\.?|Episode)\s*0*(\d+)/i, // Matches: 第1集, EP01
                    /[【\[]\s*0*(\d+)\s*[】\]]/, // Matches: [01], 【01】
                    /^\s*0*(\d+)\s*$/, // Matches: 1, 01 (Exact match)
                    /\s+0*(\d+)\s+/, // Matches: " 01 " (Number surrounded by spaces)
                ];

                const targetEp = anime.episodes.find((ep: any) => {
                    const t = ep.episodeTitle || '';
                    for (const r of regexes) {
                        const m = t.match(r);
                        if (m && parseInt(m[1], 10) === episodeNum) return true;
                    }
                    // Special complex chinese case
                    const chineseMatch = t.match(/第\s*(\d+)\s*集/);
                    if (chineseMatch && parseInt(chineseMatch[1], 10) === episodeNum) return true;
                    return false;
                });

                if (targetEp) {
                    episodeId = targetEp.episodeId;
                    console.log(`[Danmaku] Found via Regex in "${anime.animeTitle}": Episode ID ${episodeId}`);
                    break; 
                }
            }

            // Fallback: Index-based match
            if (!episodeId && scoredAnimes.length > 0) {
                const bestAnime = scoredAnimes[0];
                if (bestAnime.episodes && bestAnime.episodes.length > episodeIndex) {
                    episodeId = bestAnime.episodes[episodeIndex].episodeId;
                    console.log(`[Danmaku] Found via Index in "${bestAnime.animeTitle}": Episode ID ${episodeId}`);
                }
            }
        }
    } catch (e) {
        console.warn('[Danmaku] Strategy 1 failed', e);
    }

    // --- Strategy 2: Match API (Simulated Filename) ---
    if (!episodeId) {
        try {
            console.log('[Danmaku] Strategy 2: Simulated Filename Match');
            // Simulate a standard filename: Title.S01E01.mp4
            const fileName = `${cleanTitle}.S01E${episodeNum.toString().padStart(2, '0')}.mp4`;
            const matchRes = await robustFetch(API_MATCH, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName,
                    fileHash: '00000000000000000000000000000000',
                    fileSize: 0,
                    videoDuration: 0,
                    matchMode: 'hashAndFileName'
                })
            });
            const matchData = await matchRes.json();
            if (matchData.isMatched && matchData.matches && matchData.matches.length > 0) {
                episodeId = matchData.matches[0].episodeId;
                console.log(`[Danmaku] Found via Match API: Episode ID ${episodeId}`);
            }
        } catch(e) {
             console.warn('[Danmaku] Strategy 2 failed', e);
        }
    }

    // --- Strategy 3: Standard Search (Anime -> Episodes) ---
    if (!episodeId) {
         try {
            console.log('[Danmaku] Strategy 3: Standard Anime Search');
            const searchUrl = `${API_SEARCH_ANIME}?keyword=${encodeURIComponent(cleanTitle)}`;
            const res = await robustFetch(searchUrl);
            const data = await res.json();
             if (data.animes && data.animes.length > 0) {
                 const animeId = data.animes[0].animeId;
                 // Need to fetch details for this anime to get episodes? 
                 // Assuming episodes might be in search result or need another call.
                 // Usually search/anime returns structure similar to search/episodes but sometimes without episode details.
                 // If episodes are present:
                 if (data.animes[0].episodes && data.animes[0].episodes.length > episodeIndex) {
                      episodeId = data.animes[0].episodes[episodeIndex].episodeId;
                 }
             }
         } catch(e) {
             console.warn('[Danmaku] Strategy 3 failed', e);
         }
    }

    // --- Strategy 4: URL Match ---
    if (!episodeId && videoUrl) {
         try {
             console.log('[Danmaku] Strategy 4: URL Match');
             const urlMatchRes = await robustFetch(`${API_COMMENT}?url=${encodeURIComponent(videoUrl)}&format=json`);
             const data = await urlMatchRes.json();
             if (data.comments) {
                 console.log(`[Danmaku] Found via URL Match`);
                 return transformDanmaku(data.comments);
             }
         } catch (e) {
             console.warn('[Danmaku] Strategy 4 failed', e);
         }
    }

    // Fetch comments if ID found
    if (episodeId) {
        try {
            console.log(`[Danmaku] Fetching comments for Episode ID: ${episodeId}`);
            const commentUrl = `${API_COMMENT}/${episodeId}?withRelated=true&format=json`;
            const res = await robustFetch(commentUrl);
            const data = await res.json();
            if (data.comments) {
                return transformDanmaku(data.comments);
            }
        } catch(e) {
             console.error('[Danmaku] Failed to fetch comments', e);
        }
    }
    
    return [];
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
};

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, onEnded, onNext, title, episodeIndex = 0, doubanId } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const latestOnEnded = useRef(onEnded);
  const latestOnNext = useRef(onNext);

  useEffect(() => {
    latestOnEnded.current = onEnded;
    latestOnNext.current = onNext;
  }, [onEnded, onNext]);

  useImperativeHandle(ref, () => ({
      getInstance: () => artRef.current
  }));

  useEffect(() => {
      const observer = new ResizeObserver(() => {
          if (artRef.current && typeof artRef.current.resize === 'function') {
              artRef.current.resize();
          }
      });
      if (containerRef.current) {
          observer.observe(containerRef.current);
      }
      return () => observer.disconnect();
  }, []);

  useEffect(() => {
      if (!containerRef.current || !url) return;
      
      if (artRef.current && artRef.current.destroy) {
          artRef.current.destroy(false);
      }

      let hasSkippedHead = false;
      let isSkippingTail = false;

      const DEFAULT_SKIP_HEAD = 90;
      const DEFAULT_SKIP_TAIL = 120;
      const autoNext = true; 

      let skipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
      let skipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));

      let danmakuEnabled = true;
      const isApple = /Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);

      const art = new Artplayer({
          container: containerRef.current,
          url: url,
          poster: poster,
          autoplay: autoplay,
          volume: 0.7,
          isLive: false,
          muted: false,
          autoMini: true,
          screenshot: false, 
          setting: true,
          pip: true,
          fullscreen: true,
          fullscreenWeb: true,
          
          flip: false,
          playbackRate: true,
          aspectRatio: false,

          airplay: true,
          theme: '#22c55e',
          lang: 'zh-cn',
          lock: true,
          fastForward: true,
          autoOrientation: true,
          moreVideoAttr: {
              crossOrigin: 'anonymous',
              playsInline: true,
              'webkit-playsinline': true,
          },
          plugins: [
              artplayerPluginDanmuku({
                  danmuku: () => fetchDanmaku(title || '', episodeIndex, url),
                  speed: 5,
                  opacity: 1,
                  fontSize: 25,
                  color: '#FFFFFF',
                  mode: 0,
                  margin: [10, '25%'],
                  antiOverlap: true,
                  synchronousPlayback: false,
                  visible: danmakuEnabled, 
                  emitter: false,
              }),
          ].filter(Boolean),
          controls: [
             {
                name: 'next-episode',
                position: 'left',
                index: 15,
                html: ICONS.next,
                tooltip: '下一集',
                style: { cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '2px' },
                click: function (item: any) { if (latestOnNext.current) latestOnNext.current(); },
             }
          ],
          settings: [
              {
                  html: '弹幕状态',
                  icon: ICONS.danmaku,
                  tooltip: danmakuEnabled ? '开启' : '关闭',
                  switch: danmakuEnabled,
                  onSwitch: function (item: any) {
                      const nextState = !item.switch;
                      item.tooltip = nextState ? '开启' : '关闭';
                      
                      const plugin = this.plugins.artplayerPluginDanmuku;
                      if (plugin) {
                          if (nextState) plugin.show();
                          else plugin.hide();
                      }
                      
                      if (this.template.$danmuku) {
                          this.template.$danmuku.style.display = nextState ? 'block' : 'none';
                      }

                      // Use `this` to refer to the Artplayer instance for notice
                      this.notice.show = nextState ? '弹幕已开启' : '弹幕已关闭';
                      
                      return nextState;
                  },
              },
              {
                  html: '弹幕透明度',
                  width: 250,
                  icon: ICONS.danmaku,
                  tooltip: '100%',
                  selector: [
                      { html: '100%', value: 1, default: true },
                      { html: '75%', value: 0.75 },
                      { html: '50%', value: 0.5 },
                      { html: '25%', value: 0.25 },
                  ],
                  onSelect: function (item: any) {
                      if (this.template.$danmuku) {
                          this.template.$danmuku.style.opacity = item.value;
                      }
                      return item.html;
                  },
              },
              {
                  html: '弹幕速度',
                  width: 250,
                  icon: ICONS.danmaku,
                  tooltip: '正常',
                  selector: [
                      { html: '缓慢', value: 10 },
                      { html: '正常', value: 5, default: true },
                      { html: '快速', value: 3 },
                  ],
                  onSelect: function (item: any) {
                      const plugin = this.plugins.artplayerPluginDanmuku;
                      if (plugin && plugin.config) {
                          plugin.config.speed = item.value;
                      }
                      return item.html;
                  },
              },
              {
                  html: '弹幕字号',
                  width: 250,
                  icon: ICONS.danmaku,
                  tooltip: '正常',
                  selector: [
                      { html: '大', value: 30 },
                      { html: '正常', value: 25, default: true },
                      { html: '小', value: 20 },
                  ],
                  onSelect: function (item: any) {
                      const plugin = this.plugins.artplayerPluginDanmuku;
                      if (plugin && plugin.config) {
                          plugin.config.fontSize = item.value;
                      }
                      if (this.template.$danmuku) {
                           this.template.$danmuku.style.fontSize = item.value + 'px';
                      }
                      return item.html;
                  },
              },
              {
                  html: '跳过片头',
                  width: 250,
                  tooltip: skipHead > 0 ? skipHead+'秒' : '关闭',
                  icon: ICONS.skipStart,
                  selector: SKIP_OPTIONS.map(o => ({
                      default: o.value === skipHead,
                      html: o.html,
                      url: o.value
                  })),
                  onSelect: function(item: any) {
                      skipHead = item.url;
                      localStorage.setItem('art_skip_head', String(skipHead));
                      return item.html;
                  }
              },
              {
                  html: '跳过片尾',
                  width: 250,
                  tooltip: skipTail > 0 ? skipTail+'秒' : '关闭',
                  icon: ICONS.skipEnd,
                  selector: SKIP_OPTIONS.map(o => ({
                      default: o.value === skipTail,
                      html: o.html,
                      url: o.value
                  })),
                  onSelect: function(item: any) {
                      skipTail = item.url;
                      localStorage.setItem('art_skip_tail', String(skipTail));
                      return item.html;
                  }
              }
          ],
          customType: {
              m3u8: function (video: HTMLVideoElement, url: string, art: any) {
                  if (Hls.isSupported()) {
                      class CustomLoader extends Hls.DefaultConfig.loader {
                          constructor(config: any) { super(config); }
                          load(context: any, config: any, callbacks: any) {
                              if (context.type === 'manifest' || context.type === 'level') {
                                  const onSuccess = callbacks.onSuccess;
                                  callbacks.onSuccess = function (response: any, stats: any, ctx: any) {
                                      if (response.data && typeof response.data === 'string') {
                                          try { response.data = filterAdsFromM3U8(response.data); } catch (e) {}
                                      }
                                      return onSuccess(response, stats, ctx, null);
                                  };
                              }
                              super.load(context, config, callbacks);
                          }
                      }

                      const hls = new Hls({
                          debug: false,
                          enableWorker: true,
                          maxBufferLength: 60,
                          maxMaxBufferLength: 600,
                          startLevel: -1,
                          autoStartLoad: true,
                          pLoader: CustomLoader,
                      });

                      if (P2PEngine && P2PEngine.isSupported()) {
                          try {
                            new P2PEngine(hls, {
                                maxBufSize: 120 * 1000 * 1000,
                                p2pEnabled: true,
                            }).on('stats', (stats: any) => {
                                // stats collection
                            });
                          } catch (e) {}
                      }

                      hls.loadSource(url);
                      hls.attachMedia(video);
                      art.hls = hls;
                      art.on('destroy', () => hls.destroy());
                  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                      video.src = url;
                  } else {
                      art.notice.show = 'Unsupported playback format: m3u8';
                  }
              }
          },
      });
      
      art.controls.add({
        name: 'cast',
        position: 'right',
        index: 40,
        html: isApple ? ICONS.airPlay : ICONS.chromecast,
        tooltip: isApple ? 'AirPlay' : '投屏',
        style: { cursor: 'pointer', marginRight: '4px' },
        click: function (item: any) {
           const video = art.video as any;
           if (isApple && video.webkitShowPlaybackTargetPicker) {
               video.webkitShowPlaybackTargetPicker();
           } else {
               art.notice.show = '请使用浏览器菜单(⋮)中的"投屏"功能';
           }
        },
        mounted: function($el: HTMLElement) {
            const video = art.video as any;
            if (isApple && video.webkitPlaybackTargetAvailability !== undefined) {
                const onAvailabilityChange = (event: any) => {
                    $el.style.display = event.availability === 'available' ? 'flex' : 'none';
                };
                video.addEventListener('webkitplaybacktargetavailabilitychanged', onAvailabilityChange);
                const onTargetChange = () => {
                     const isConnected = video.webkitCurrentPlaybackTargetIsWireless;
                     $el.style.color = isConnected ? '#34d399' : '';
                     art.notice.show = isConnected ? 'AirPlay 投屏已连接' : '';
                };
                video.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', onTargetChange);
            }
        }
      });

      art.on('ready', () => {
          const progressKey = `cine_progress_${url}`;
          const savedTimeStr = localStorage.getItem(progressKey);
          if (savedTimeStr) {
              const savedTime = parseFloat(savedTimeStr);
              if (!isNaN(savedTime) && savedTime > 5 && savedTime < art.duration - 5) {
                  art.seek = savedTime;
                  art.notice.show = `已恢复至 ${formatTime(savedTime)}`;
              }
          }
      });

      artRef.current = art;

      art.on('video:timeupdate', function() {
          if (art.currentTime > 0) {
              localStorage.setItem(`cine_progress_${url}`, String(art.currentTime));
          }
          const currentSkipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
          const currentSkipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));
          
          if (currentSkipHead > 0 && !hasSkippedHead && art.duration > 300) {
             if (art.currentTime < currentSkipHead) {
                art.notice.show = `已跳过片头`;
                art.seek = currentSkipHead;
                art.play();
             }
             hasSkippedHead = true;
          }

          if (currentSkipTail > 0 && !isSkippingTail && art.duration > 300) {
              const rem = art.duration - art.currentTime;
              if (rem > 0 && rem <= currentSkipTail) {
                  isSkippingTail = true;
                  if (autoNext && latestOnNext.current) {
                      art.notice.show = '即将播放下一集';
                      setTimeout(() => { if (latestOnNext.current) latestOnNext.current(); }, 1000); 
                  }
              }
          }
      });

      art.on('seek', () => { isSkippingTail = false; });
      art.on('restart', () => { isSkippingTail = false; hasSkippedHead = false; });
      art.on('video:ended', () => {
         localStorage.removeItem(`cine_progress_${url}`);
         if (autoNext && latestOnNext.current) latestOnNext.current();
      });

      return () => {
          if (artRef.current && artRef.current.destroy) {
              artRef.current.destroy(false);
              artRef.current = null;
          }
      };
  }, [url, autoplay, poster, title, episodeIndex]); 

  return (
      <div className="w-full aspect-video lg:aspect-auto lg:h-[500px] bg-black lg:rounded-xl overflow-hidden shadow-2xl border border-glass-border ring-1 ring-white/10 group relative z-0">
          <style>{`
            .art-danmuku-control, .art-control-danmuku { display: none !important; }
            @media (max-width: 768px) {
                .art-controls .art-control { padding: 0 4px !important; }
                .art-control-volume { display: none !important; }
            }
          `}</style>
          <div ref={containerRef} className="w-full h-full" />
      </div>
  );
});

export default VideoPlayer;