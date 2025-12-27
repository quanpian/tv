
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
    next: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
    commentAdd: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338C8.47 21.513 10.179 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm1 14h-2v-3H8v-2h3V8h2v3h3v2h-3v3z"/></svg>',
};

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, title, episodeIndex = 0, vodId, className } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const latestOnNext = useRef(props.onNext);
  useEffect(() => { latestOnNext.current = props.onNext; }, [props.onNext]);

  useImperativeHandle(ref, () => ({ getInstance: () => artRef.current }));

  useEffect(() => {
      if (!containerRef.current || !url) return;
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
      artRef.current = art;
      return () => { if (artRef.current) artRef.current.destroy(true); };
  }, [vodId, url]);

  return <div ref={containerRef} className={`w-full h-full bg-black ${className || ''}`} />;
});

export default VideoPlayer;
