
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Artplayer from 'artplayer';
import artplayerPluginDanmuku from 'artplayer-plugin-danmuku';
import Hls from 'hls.js';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  autoplay?: boolean;
  onEnded?: () => void;
  onNext?: () => void;
  title?: string;
  episodeIndex?: number;
  doubanId?: string;
  vodId?: string | number;
  className?: string;
}

const ICONS = {
    skipStart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 4h2v16H5V4zm4 1v14l11-7L9 5z"/></svg>',
    skipEnd: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 5l11 7-11 7V5zm12-1h2v16h-2V4z"/></svg>',
    danmaku: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    next: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>'
};

const SKIP_OPTIONS = [
    { html: '关闭', value: 0 }, { html: '30秒', value: 30 }, { html: '45秒', value: 45 }, { html: '60秒', value: 60 }, { html: '90秒', value: 90 }, { html: '120秒', value: 120 }, { html: '150秒', value: 150 }, { html: '180秒', value: 180 },
];

const DANMAKU_API = 'https://daili.laibo123.dpdns.org/5573108/api/v2/comment'; 
const CACHE_TTL = 15 * 60 * 1000; 

const fetchDanmaku = async (title: string, episodeIndex: number, vodId: string | number) => {
    const cacheKey = `cine_danmaku_${vodId}_${episodeIndex}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) return data;
        }
    } catch (e) {}

    try {
        const response = await fetch(`${DANMAKU_API}/match?name=${encodeURIComponent(title)}&episode=${episodeIndex + 1}`, {
            signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) return [];
        const result = await response.json();
        const rawData = result.data || result;
        if (!Array.isArray(rawData)) return [];

        const formatted = rawData.map((item: any) => {
            if (Array.isArray(item)) {
                return {
                    time: parseFloat(item[0]),
                    mode: item[1] === 1 ? 0 : (item[1] || 0),
                    color: typeof item[2] === 'number' ? `#${item[2].toString(16).padStart(6, '0')}` : (item[2] || '#ffffff'),
                    author: item[3] || 'CineStream',
                    text: item[4] || ''
                };
            }
            return item;
        }).filter(d => d.text && d.text.length < 150);

        try {
            localStorage.setItem(cacheKey, JSON.stringify({ data: formatted, timestamp: Date.now() }));
        } catch (e) {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('cine_danmaku_')) localStorage.removeItem(key);
            });
        }
        return formatted;
    } catch (e) { return []; }
};

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, onNext, title, episodeIndex = 0, vodId, className } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; }, [props]);

  const latestOnNext = useRef(onNext);
  useEffect(() => { latestOnNext.current = onNext; }, [onNext]);

  useImperativeHandle(ref, () => ({ getInstance: () => artRef.current }));

  // 获取当前视频的存储 Key
  const getProgressKey = () => {
    const p = propsRef.current;
    return (p.vodId && p.episodeIndex !== undefined) 
        ? `cine_progress_${p.vodId}_${p.episodeIndex}` 
        : `cine_progress_url_${btoa(p.url).slice(0, 16)}`;
  };

  const loadDanmakuAsync = async (art: Artplayer) => {
      const plugin = (art.plugins as any).artplayerPluginDanmuku;
      if (!plugin || !propsRef.current.vodId) return;
      const danmaku = await fetchDanmaku(propsRef.current.title || '', propsRef.current.episodeIndex || 0, propsRef.current.vodId);
      if (danmaku.length > 0) {
          plugin.config({ danmuku: danmaku });
      }
  };

  // 核心跳转逻辑
  const seekToSavedProgress = (art: Artplayer) => {
      const key = getProgressKey();
      const savedTime = parseFloat(localStorage.getItem(key) || '0');
      // 如果进度大于 5 秒且离结束还有 10 秒以上，则续播
      if (savedTime > 5 && (art.duration === 0 || savedTime < art.duration - 10)) {
          art.seek = savedTime;
          art.notice.show = `已为您自动续播至 ${Math.floor(savedTime / 60)}:${String(Math.floor(savedTime % 60)).padStart(2, '0')}`;
      }
  };

  useEffect(() => {
      const art = artRef.current;
      if (art && url && url !== art.url) {
          art.switchUrl(url).then(() => {
              seekToSavedProgress(art);
              loadDanmakuAsync(art);
          });
      }
  }, [url, episodeIndex, vodId]);

  useEffect(() => {
      if (!containerRef.current || !url) return;
      
      const initPlayer = () => {
          const DEFAULT_SKIP_HEAD = 90, DEFAULT_SKIP_TAIL = 120;
          let skipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
          let skipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));

          const art = new Artplayer({
              container: containerRef.current!, url: url, poster: poster, autoplay: autoplay, volume: 0.7,
              theme: '#22c55e', lang: 'zh-cn', lock: true, fastForward: true, autoOrientation: true,
              fullscreen: true, fullscreenWeb: true, setting: true, pip: true,
              moreVideoAttr: { crossOrigin: 'anonymous', playsInline: true, 'webkit-playsinline': true } as any,
              plugins: [
                  artplayerPluginDanmuku({
                      danmuku: [], speed: 10, opacity: 0.8, fontSize: 24, visible: true, emitter: false,
                  }),
              ],
              controls: [
                 { name: 'next-episode', position: 'left', index: 15, html: ICONS.next, tooltip: '下一集', click: function () { if (latestOnNext.current) latestOnNext.current(); } },
                 { 
                    name: 'danmaku-toggle', 
                    position: 'right', 
                    index: 10, 
                    html: ICONS.danmaku, 
                    tooltip: '弹幕开关', 
                    click: function () { 
                        const plugin = (this.plugins as any).artplayerPluginDanmuku;
                        if (plugin) { if (plugin.visible) plugin.hide(); else plugin.show(); }
                    } 
                 }
              ],
              settings: [
                  { html: '跳过片头', width: 250, tooltip: skipHead+'秒', icon: ICONS.skipStart, selector: SKIP_OPTIONS.map(o => ({ default: o.value === skipHead, html: o.html, url: o.value })), onSelect: function(item: any) { skipHead = item.url; localStorage.setItem('art_skip_head', String(skipHead)); return item.html; } },
                  { html: '跳过片尾', width: 250, tooltip: skipTail+'秒', icon: ICONS.skipEnd, selector: SKIP_OPTIONS.map(o => ({ default: o.value === skipTail, html: o.html, url: o.value })), onSelect: function(item: any) { skipTail = item.url; localStorage.setItem('art_skip_tail', String(skipTail)); return item.html; } }
              ],
              customType: {
                  m3u8: function (video: HTMLVideoElement, url: string, art: any) {
                      if (Hls.isSupported()) {
                          const hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
                          hls.loadSource(url); hls.attachMedia(video);
                          art.hls = hls; art.on('destroy', () => hls.destroy());
                      } else if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = url; }
                  }
              },
          });

          art.on('ready', () => {
              seekToSavedProgress(art);
              loadDanmakuAsync(art);
          });

          art.on('video:timeupdate', function() {
              const key = getProgressKey();
              
              // 1. 进度记录逻辑
              if (art.currentTime > 5) {
                  // 如果离结束不到 10 秒，视为已播放完毕，清除记录
                  if (art.duration > 30 && (art.duration - art.currentTime) < 10) {
                      localStorage.removeItem(key);
                  } else {
                      localStorage.setItem(key, String(art.currentTime));
                  }
              }

              // 2. 自动跳过片头
              if (skipHead > 0 && art.duration > 300 && art.currentTime < skipHead && !art.userSeek) {
                  art.seek = skipHead;
                  art.notice.show = `已为您跳过片头 ${skipHead} 秒`;
              }

              // 3. 自动跳过片尾并切集
              if (skipTail > 0 && art.duration > 300 && art.currentTime > 60 && (art.duration - art.currentTime) <= skipTail && !art.userSeek) {
                  if (latestOnNext.current) { 
                      localStorage.removeItem(key); // 切换下一集前清除当前进度
                      latestOnNext.current(); 
                  }
              }
          });

          artRef.current = art;
          return () => { if (artRef.current) artRef.current.destroy(true); };
      };

      initPlayer();
  }, [vodId]);

  return (
      <div className={`w-full aspect-video lg:aspect-auto lg:h-full bg-black group relative z-0 ${className || ''}`}>
          <style>{`
            .art-bottom { padding: 0 20px 20px !important; background: transparent !important; }
            .art-controls {
                background: rgba(15, 23, 42, 0.4) !important;
                backdrop-filter: blur(32px) saturate(180%) !important;
                -webkit-backdrop-filter: blur(32px) saturate(180%) !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                border-radius: 24px !important;
                box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5) !important;
                height: 60px !important;
                padding: 0 16px !important;
            }
            .art-progress { bottom: 70px !important; height: 5px !important; }
            .art-progress-indicator { background: #22c55e !important; border: 3px solid #fff !important; width: 16px !important; height: 16px !important; box-shadow: 0 0 15px rgba(34, 197, 94, 0.8) !important; }
            .art-notice { background: rgba(34, 197, 94, 0.9) !important; border-radius: 100px !important; padding: 12px 28px !important; font-weight: 900 !important; font-size: 14px !important; letter-spacing: 0.1em !important; box-shadow: 0 10px 20px rgba(0,0,0,0.3) !important; }
            
            @media (max-width: 768px) {
                .art-bottom { padding: 0 10px 10px !important; }
                .art-controls { height: 52px !important; border-radius: 16px !important; }
                .art-progress { bottom: 62px !important; }
            }
          `}</style>
          <div ref={containerRef} className="w-full h-full" />
      </div>
  );
});

export default VideoPlayer;
