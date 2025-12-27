
import React, { useState, useEffect, useRef } from 'react';
import { getDoubanPoster } from '../services/vodService';

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450' style='background:%23111827'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23374151' font-family='sans-serif' font-size='24' font-weight='bold'%3ECineStream%3C/text%3E%3C/svg%3E";

const PROXY_BASE = 'https://images.weserv.nl/?url=';
const BAD_IMAGE_PATTERNS = ['nopic', 'mac_default', 'no_pic', 'default.jpg', 'error.png', 'placeholder', 'error.jpg', 'static/img/'];

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  searchKeyword?: string;
  priority?: boolean;
  size?: 's' | 'm' | 'l';
}

const ImageWithFallback: React.FC<ImageProps> = ({ 
  src, 
  alt, 
  className, 
  searchKeyword, 
  priority = false, 
  size = 'l', 
  ...props 
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [inView, setInView] = useState(priority);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px' } // 加大预加载边距
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [priority]);

  const processUrl = (url: string, useProxy: boolean) => {
    if (!url) return FALLBACK_IMG;
    let finalUrl = url.trim();
    if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;

    if (finalUrl.includes('doubanio.com')) {
        if (finalUrl.includes('/public/')) {
            finalUrl = finalUrl.replace(/s_ratio_poster|m(?=\/public)|s(?=\/public)|l(?=\/public)/, size);
        }
        if (useProxy) {
            // 极致压缩设置：webp + q=70 + 缩放
            const quality = 70;
            const width = size === 'l' ? 500 : (size === 'm' ? 300 : 150);
            return `${PROXY_BASE}${encodeURIComponent(finalUrl)}&output=webp&q=${quality}&w=${width}&n=-1`;
        }
    }

    return finalUrl;
  };

  useEffect(() => {
    if (!inView || !src) {
        if (!src && inView && searchKeyword) handleSearch();
        else if (!src && inView) { setImgSrc(FALLBACK_IMG); setLoading(false); }
        return;
    }

    const isBad = BAD_IMAGE_PATTERNS.some(p => src.toLowerCase().includes(p));
    if (isBad) {
        if (searchKeyword) handleSearch();
        else { setImgSrc(FALLBACK_IMG); setLoading(false); }
        return;
    }

    if (retryCount === 0) {
        setImgSrc(processUrl(src, false));
    } else if (retryCount === 1) {
        setImgSrc(processUrl(src, true));
    } else {
        if (searchKeyword && retryCount === 2) handleSearch();
        else { setImgSrc(FALLBACK_IMG); setLoading(false); }
    }
  }, [src, inView, retryCount, size]);

  const handleSearch = async () => {
    if (!searchKeyword) {
        setImgSrc(FALLBACK_IMG);
        setLoading(false);
        return;
    }
    try {
        const newUrl = await getDoubanPoster(searchKeyword);
        if (newUrl) {
            setRetryCount(0);
            setImgSrc(processUrl(newUrl, false));
        } else {
            setImgSrc(FALLBACK_IMG);
            setLoading(false);
        }
    } catch (e) {
        setImgSrc(FALLBACK_IMG);
        setLoading(false);
    }
  };

  const onError = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-[#0f172a] ${className}`}
      style={{ aspectRatio: props.style?.aspectRatio || '2/3' }}
    >
      {loading && (
        <div className="absolute inset-0 z-0 flex items-center justify-center">
            <div className="w-full h-full skeleton-shimmer animate-shimmer" />
        </div>
      )}
      {inView && imgSrc && (
        <img 
          src={imgSrc} 
          alt={alt || ""} 
          className={`w-full h-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
          onError={onError}
          onLoad={() => setLoading(false)}
          referrerPolicy="no-referrer" 
          loading={priority ? "eager" : "lazy"}
          {...props} 
        />
      )}
    </div>
  );
};

export default ImageWithFallback;
