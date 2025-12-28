
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
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
  vodId?: string | number;
  className?: string;
}

const ICONS = {
    skipStart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 4h2v16H5V4zm4 1v14l11-7L9 5z"/></svg>',
    skipEnd: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 5l11 7-11 7V5zm12-1h2v16h-2V4z"/></svg>',
    danmaku: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    next: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
    commentAdd: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338C8.47 21.513 10.179 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm1 14h-2v-3H8v-2h3V8h2v3h3v2h-3v3z"/></svg>',
    send: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>'
};

const SKIP_OPTIONS = [
    { html: '关闭', value: 0 },
    { html: '30秒', value: 30 },
    { html: '45秒', value: 45 },
    { html: '60秒', value: 60 },
    { html: '90秒', value: 90 },
    { html: '120秒', value: 120 },
];

const AD_PATTERNS = [
    'googleads', 'doubleclick', '/ad/', 'ad_', '.m3u8_ad', 
    'advertisement', 'ignore=', 'guanggao', 'hecheng', 
    '666666', '555555', '999999', 'hl_ad'
];

function filterAdsFromM3U8(m3u8Content: string): string {
    if (!m3u8Content) return '';
    const lines = m3u8Content.split('\n');
    const filteredLines: string[] = [];
    let isAd = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('EXT-X-CUE-OUT') || line.includes('SCTE35')) { isAd = true; continue; }
        if (line.includes('EXT-X-CUE-IN')) { isAd = false; continue; }
        if (isAd) continue;
        if (line && !line.startsWith('#')) {
             if (AD_PATTERNS.some(p => line.toLowerCase().includes(p))) {
                 if (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].includes('#EXTINF')) filteredLines.pop();
                 continue;
             }
        }
        filteredLines.push(lines[i]);
    }
    return filteredLines.join('\n');
}

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, onNext, title, episodeIndex = 0, vodId, className } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showDanmakuInput, setShowDanmakuInput] = useState(false);
  const [danmakuText, setDanmakuText] = useState('');
  
  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; }, [props]);

  const latestOnNext = useRef(onNext);
  useEffect(() => { latestOnNext.current = onNext; }, [onNext]);

  useImperativeHandle(ref, () => ({ getInstance: () => artRef.current }));

  const handleSendDanmaku = () => {
    if (!danmakuText.trim() || !artRef.current) return;
    const art = artRef.current;
    const danmakuPlugin = (art.plugins as any).artplayerPluginDanmuku;
    if (danmakuPlugin) {
        danmakuPlugin.emit({ text: danmakuText, color: '#22c55e', style: { border: '1px solid #22c55e', borderRadius: '4px', padding: '2px 8px' } });
        art.notice.show = '弹幕已发送';
        setDanmakuText('');
        setShowDanmakuInput(false);
    }
  };

  useEffect(() => {
      const art = artRef.current;
      if (art && url && url !== art.url) {
          art.switchUrl(url).then(() => {
              const progressKey = (vodId && episodeIndex !== undefined) ? `cine_progress_${vodId}_${episodeIndex}` : `cine_progress_${url}`;
              const savedTime = parseFloat(localStorage.getItem(progressKey) || '0');
              if (savedTime > 5) art.seek = savedTime;
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
              container: containerRef.current!, url, poster, autoplay, volume: 0.7,
              theme: '#22c55e', lang: 'zh-cn', lock: true, fastForward: true, autoOrientation: true,
              fullscreen: true, fullscreenWeb: true, setting: true, pip: true,
              moreVideoAttr: { crossOrigin: 'anonymous', playsInline: true, 'webkit-playsinline': true } as any,
              plugins: [
                  artplayerPluginDanmuku({
                      danmuku: [], speed: 10, opacity: 0.8, fontSize: 20, visible: true, emitter: false,
                  }),
              ],
              controls: [
                 { name: 'next-episode', position: 'left', index: 15, html: ICONS.next, tooltip: '下一集', click: function () { if (latestOnNext.current) latestOnNext.current(); } },
                 { name: 'danmaku-input-toggle', position: 'left', index: 14, html: ICONS.commentAdd, tooltip: '发弹幕', click: function () { setShowDanmakuInput(prev => !prev); } }
              ],
              settings: [
                  { html: '跳过片头', width: 250, tooltip: skipHead+'秒', icon: ICONS.skipStart, selector: SKIP_OPTIONS.map(o => ({ default: o.value === skipHead, html: o.html, url: o.value })), onSelect: function(item: any) { skipHead = item.url; localStorage.setItem('art_skip_head', String(skipHead)); return item.html; } },
                  { html: '跳过片尾', width: 250, tooltip: skipTail+'秒', icon: ICONS.skipEnd, selector: SKIP_OPTIONS.map(o => ({ default: o.value === skipTail, html: o.html, url: o.value })), onSelect: function(item: any) { skipTail = item.url; localStorage.setItem('art_skip_tail', String(skipTail)); return item.html; } }
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
                                              response.data = filterAdsFromM3U8(response.data);
                                          }
                                          return onSuccess(response, stats, ctx, null);
                                      };
                                  }
                                  super.load(context, config, callbacks);
                              }
                          }
                          const hls = new Hls({ 
                            enableWorker: true, 
                            maxBufferLength: 30, 
                            pLoader: CustomLoader as any 
                          });
                          if (P2PEngine && (P2PEngine as any).isSupported()) {
                              new (P2PEngine as any)(hls, { maxBufSize: 120 * 1024 * 1024, p2pEnabled: true });
                          }
                          hls.loadSource(url); hls.attachMedia(video);
                          art.hls = hls; 
                          art.on('destroy', () => hls.destroy());
                      } else if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = url; }
                  }
              },
          });

          art.on('ready', () => {
              const progressKey = (propsRef.current.vodId && propsRef.current.episodeIndex !== undefined) ? `cine_progress_${propsRef.current.vodId}_${propsRef.current.episodeIndex}` : `cine_progress_${propsRef.current.url}`;
              const savedTime = parseFloat(localStorage.getItem(progressKey) || '0');
              if (savedTime > 5 && savedTime < art.duration - 5) art.seek = savedTime;
          });

          art.on('video:timeupdate', function() {
              const progressKey = (propsRef.current.vodId && propsRef.current.episodeIndex !== undefined) ? `cine_progress_${propsRef.current.vodId}_${propsRef.current.episodeIndex}` : `cine_progress_${propsRef.current.url}`;
              if (art.currentTime > 0) localStorage.setItem(progressKey, String(art.currentTime));
              if (skipHead > 0 && art.duration > 300 && art.currentTime < skipHead && !art.userSeek) art.seek = skipHead; 
              if (skipTail > 0 && art.duration > 300 && (art.duration - art.currentTime) <= skipTail && !art.userSeek) {
                  if (latestOnNext.current) { art.notice.show = '即将播放下一集'; latestOnNext.current(); }
              }
          });

          artRef.current = art;
          return () => { if (artRef.current) artRef.current.destroy(true); };
      };

      initPlayer();
  }, [vodId]);

  return (
      <div className={`w-full aspect-video lg:aspect-auto lg:h-full bg-black group relative z-0 ${className || ''}`}>
          <div ref={containerRef} className="w-full h-full" />
          {showDanmakuInput && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-[100] animate-slide-up">
                  <div className="bg-black/60 backdrop-blur-xl border border-brand/30 rounded-full p-1.5 flex gap-2 shadow-2xl items-center">
                      <input 
                        type="text" value={danmakuText} onChange={(e) => setDanmakuText(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSendDanmaku()} 
                        placeholder="发条友善的弹幕吧..." 
                        className="flex-1 bg-transparent border-none outline-none text-white px-4 py-1.5 text-sm" autoFocus 
                      />
                      <button onClick={handleSendDanmaku} disabled={!danmakuText.trim()} className="bg-brand text-black p-2 rounded-full transition-all active:scale-95 disabled:opacity-50">
                        {ICONS.send}
                      </button>
                      <button onClick={() => setShowDanmakuInput(false)} className="text-gray-400 hover:text-white px-3 py-1.5 text-xs">取消</button>
                  </div>
              </div>
          )}
      </div>
  );
});

export default VideoPlayer;
