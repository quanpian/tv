
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
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
    next: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
    ad: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" /></svg>'
};

const SKIP_OPTIONS = [
    { html: '关闭', value: 0 }, 
    { html: '15秒', value: 15 },
    { html: '30秒', value: 30 }, 
    { html: '45秒', value: 45 }, 
    { html: '60秒', value: 60 }, 
    { html: '90秒', value: 90 }, 
    { html: '120秒', value: 120 }
];

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, title, episodeIndex = 0, vodId, className } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  const [showSkipAd, setShowSkipAd] = useState(false);

  useEffect(() => { propsRef.current = props; }, [props]);

  useImperativeHandle(ref, () => ({ getInstance: () => artRef.current }));

  const handleSkipAd = () => {
    if (artRef.current) {
        // 通常插播广告在 15-60s 之间，点击跳过直接跳转到 60s 或用户设定的片头位置
        const skipHead = parseInt(localStorage.getItem('art_skip_head') || '0');
        const jumpTo = Math.max(60, skipHead);
        artRef.current.seek = jumpTo;
        artRef.current.notice.show = '已为您成功跳过插播广告';
        setShowSkipAd(false);
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

      let skipHead = parseInt(localStorage.getItem('art_skip_head') || '0');
      let skipTail = parseInt(localStorage.getItem('art_skip_tail') || '0');
      let autoSkipAd = localStorage.getItem('art_auto_skip_ad') === 'true';

      const art = new Artplayer({
          container: containerRef.current!, 
          url: url, 
          poster: poster, 
          autoplay: autoplay, 
          volume: 0.7,
          theme: '#22c55e', 
          lang: 'zh-cn', 
          lock: true, 
          fastForward: true, 
          autoOrientation: true,
          fullscreen: true, 
          fullscreenWeb: true, 
          setting: true, 
          pip: true,
          moreVideoAttr: { crossOrigin: 'anonymous', playsInline: true, 'webkit-playsinline': true } as any,
          plugins: [
              artplayerPluginDanmuku({
                  danmuku: [], speed: 10, opacity: 0.8, fontSize: 24, visible: true, emitter: false,
              }),
          ],
          controls: [
             { 
                 name: 'next-episode', 
                 position: 'left', 
                 index: 15, 
                 html: ICONS.next, 
                 tooltip: '下一集', 
                 click: function () { if (propsRef.current.onNext) propsRef.current.onNext(); } 
             },
          ],
          settings: [
              {
                  html: '自动跳过插播广告',
                  width: 200,
                  tooltip: autoSkipAd ? '开启' : '关闭',
                  switch: autoSkipAd,
                  onSelect: function(item: any) {
                      autoSkipAd = !item.switch;
                      localStorage.setItem('art_auto_skip_ad', String(autoSkipAd));
                      art.notice.show = `自动跳过广告已${autoSkipAd ? '开启' : '关闭'}`;
                      return autoSkipAd;
                  }
              },
              {
                  html: '跳过片头',
                  width: 200,
                  tooltip: skipHead + '秒',
                  icon: ICONS.skipStart,
                  selector: SKIP_OPTIONS.map(o => ({
                      default: o.value === skipHead,
                      html: o.html,
                      value: o.value
                  })),
                  onSelect: function(item: any) {
                      skipHead = item.value;
                      localStorage.setItem('art_skip_head', String(skipHead));
                      art.notice.show = `片头跳过已设为 ${item.html}`;
                      return item.html;
                  }
              },
              {
                  html: '跳过片尾',
                  width: 200,
                  tooltip: skipTail + '秒',
                  icon: ICONS.skipEnd,
                  selector: SKIP_OPTIONS.map(o => ({
                      default: o.value === skipTail,
                      html: o.html,
                      value: o.value
                  })),
                  onSelect: function(item: any) {
                      skipTail = item.value;
                      localStorage.setItem('art_skip_tail', String(skipTail));
                      art.notice.show = `片尾跳过已设为 ${item.html}`;
                      return item.html;
                  }
              }
          ],
          customType: {
              m3u8: function (video: HTMLVideoElement, url: string, art: any) {
                  if (Hls.isSupported()) {
                      const hls = new Hls();
                      hls.loadSource(url); hls.attachMedia(video);
                      art.hls = hls; art.on('destroy', () => hls.destroy());
                  } else if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = url; }
              }
          },
      });

      art.on('ready', () => {
          const progressKey = (propsRef.current.vodId && propsRef.current.episodeIndex !== undefined) ? `cine_progress_${propsRef.current.vodId}_${propsRef.current.episodeIndex}` : `cine_progress_${propsRef.current.url}`;
          const savedTime = parseFloat(localStorage.getItem(progressKey) || '0');
          if (savedTime > 5 && savedTime < art.duration - 5) {
              art.seek = savedTime;
              art.notice.show = `[自动续播] 已回到上次观看位置`;
          }
      });

      art.on('video:timeupdate', () => {
          const progressKey = (propsRef.current.vodId && propsRef.current.episodeIndex !== undefined) ? `cine_progress_${propsRef.current.vodId}_${propsRef.current.episodeIndex}` : `cine_progress_${propsRef.current.url}`;
          if (art.currentTime > 0) localStorage.setItem(progressKey, String(art.currentTime));

          // 智能广告检测：前 60s 内如果没设置自动跳过片头，则显示跳过广告按钮
          if (art.currentTime < 60 && art.currentTime > 2 && !autoSkipAd) {
              if (!showSkipAd) setShowSkipAd(true);
          } else {
              if (showSkipAd) setShowSkipAd(false);
          }

          // 如果开启了自动跳过广告且当前处于前 15s (通常广告时长)
          if (autoSkipAd && art.currentTime < 15 && art.duration > 300 && !art.userSeek) {
              art.seek = 15;
              art.notice.show = '已为您自动拦截插播广告';
          }

          // 自动跳过片头
          if (skipHead > 0 && art.duration > 300 && art.currentTime < skipHead && !art.userSeek) {
              art.seek = skipHead;
              art.notice.show = `已自动跳过片头 ${skipHead}s`;
          }

          // 自动跳过片尾
          if (skipTail > 0 && art.duration > 300 && art.currentTime > 60 && (art.duration - art.currentTime) <= skipTail && !art.userSeek) {
              if (propsRef.current.onNext) {
                  art.notice.show = '即将为您播放下一集';
                  propsRef.current.onNext();
              }
          }
      });

      artRef.current = art;
      return () => { if (artRef.current) artRef.current.destroy(true); };
  }, [vodId]);

  return (
    <div className={`w-full h-full bg-black relative group/player ${className || ''}`}>
        <style>{`
            .art-setting-item { font-weight: 900 !important; }
            .art-notice { background: rgba(34, 197, 94, 0.9) !important; border-radius: 100px !important; box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important; }
            @keyframes slideInRight {
                from { transform: translateX(100px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .animate-slide-in-right { animation: slideInRight 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        `}</style>
        
        <div ref={containerRef} className="w-full h-full" />

        {/* 悬浮跳过广告按钮 */}
        {showSkipAd && (
            <div className="absolute bottom-24 right-6 z-50 animate-slide-in-right">
                <button 
                    onClick={handleSkipAd}
                    className="flex items-center gap-2 px-6 py-3 bg-black/60 backdrop-blur-2xl border border-white/20 rounded-full text-white font-black text-sm shadow-2xl hover:bg-brand hover:text-black transition-all group/adbtn ring-1 ring-white/10"
                >
                    <span dangerouslySetInnerHTML={{ __html: ICONS.ad }} className="text-brand group-hover/adbtn:text-black" />
                    跳过插播广告
                </button>
            </div>
        )}
    </div>
  );
});

export default VideoPlayer;
