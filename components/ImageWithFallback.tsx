import React, { useState, useEffect } from 'react';
import { getDoubanPoster } from '../services/vodService';

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450' style='background:%23111827'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23374151' font-family='sans-serif' font-size='24' font-weight='bold'%3ECineStream%3C/text%3E%3C/svg%3E";

const CACHE_PREFIX = 'poster_cache_v2_';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  searchKeyword?: string;
}

const ImageWithFallback: React.FC<ImageProps> = ({ src, alt, className, searchKeyword, ...props }) => {
  const [imgSrc, setImgSrc] = useState<string>(FALLBACK_IMG);
  const [retryStage, setRetryStage] = useState(0); 

  useEffect(() => {
    let url = src?.trim();
    
    if (!url) {
      setImgSrc(FALLBACK_IMG);
      return;
    }
    
    if (url.startsWith('//')) {
      url = 'https:' + url;
    }

    // Direct CMS images usually work fine.
    // Douban images need proxy.
    const isDouban = url.includes('doubanio.com');
    const isHttp = url.startsWith('http:');

    if (isDouban || isHttp) {
        // Use wsrv.nl proxy immediately for Douban or HTTP
        // wsrv.nl is powered by Cloudflare, usually works in CN
        setImgSrc(`https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp`);
        setRetryStage(1);
    } else {
        // Try direct load for others
        setImgSrc(url);
        setRetryStage(0);
    }

  }, [src]);

  const handleError = () => {
    let originalUrl = src?.trim() || '';
    if (originalUrl.startsWith('//')) originalUrl = 'https:' + originalUrl;

    if (retryStage === 0 && originalUrl) {
      // Direct failed -> Try Proxy
      setImgSrc(`https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}&output=webp`);
      setRetryStage(1);
    } else {
      // Proxy failed -> Give up, show fallback
      if (retryStage !== 2) {
          setImgSrc(FALLBACK_IMG);
          setRetryStage(2);
      }
    }
  };

  return (
    <img 
      src={imgSrc} 
      alt={alt || "Poster"} 
      className={`${className} ${imgSrc === FALLBACK_IMG ? 'opacity-50 grayscale p-4 bg-gray-900' : 'bg-gray-800'}`}
      onError={handleError}
      referrerPolicy="no-referrer" 
      loading="lazy"
      {...props} 
    />
  );
};

export default ImageWithFallback;