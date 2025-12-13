import React, { useState, useEffect } from 'react';
import { getDoubanPoster } from '../services/vodService';

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450' style='background:%23111827'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23374151' font-family='sans-serif' font-size='24' font-weight='bold'%3ECineStream%3C/text%3E%3C/svg%3E";

const CACHE_PREFIX = 'poster_cache_v2_';
// User Custom Proxy
const PROXY_URL = 'https://daili.laidd.de5.net/?url=';

// Common CMS placeholders that should be ignored
const BAD_IMAGE_PATTERNS = ['nopic', 'mac_default', 'no_pic', 'default.jpg'];

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  searchKeyword?: string;
}

const ImageWithFallback: React.FC<ImageProps> = ({ src, alt, className, searchKeyword, ...props }) => {
  const [imgSrc, setImgSrc] = useState<string>(FALLBACK_IMG);
  const [retryStage, setRetryStage] = useState(0); 

  useEffect(() => {
    let url = src?.trim();
    
    // If URL is missing OR is a known bad placeholder, try fallback immediately
    if (!url || BAD_IMAGE_PATTERNS.some(p => url.includes(p))) {
      if (searchKeyword) {
          setImgSrc(FALLBACK_IMG);
          setRetryStage(2); // Skip direct/proxy attempt, go straight to smart search
          getDoubanPoster(searchKeyword).then(newUrl => {
              if (newUrl) {
                  // New URL found via search. If it's Douban, try direct first.
                  if (newUrl.includes('doubanio.com')) {
                      setImgSrc(newUrl);
                  } else {
                      const proxyUrl = `${PROXY_URL}${encodeURIComponent(newUrl)}`;
                      setImgSrc(proxyUrl);
                  }
              } else {
                  setRetryStage(3);
              }
          });
          return;
      }
      setImgSrc(FALLBACK_IMG);
      setRetryStage(3);
      return;
    }
    
    // Normalize URL
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (!url.startsWith('http')) {
        url = 'http://' + url;
    }

    // Check cache
    const cached = localStorage.getItem(CACHE_PREFIX + url);
    if (cached) {
        setImgSrc(cached);
        return;
    }

    // STRATEGY: 
    // 1. If URL is Douban, try DIRECT load first (relying on meta no-referrer).
    // 2. If not Douban, use Proxy.
    if (url.includes('doubanio.com')) {
        setImgSrc(url);
        setRetryStage(1); 
    } else {
        const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
        setImgSrc(proxyUrl);
        setRetryStage(1);
    }

  }, [src, searchKeyword]);

  const handleError = () => {
    let originalUrl = src?.trim() || '';
    if (originalUrl.startsWith('//')) originalUrl = 'https:' + originalUrl;
    else if (originalUrl && !originalUrl.startsWith('http')) originalUrl = 'http://' + originalUrl;

    if (originalUrl) {
        localStorage.removeItem(CACHE_PREFIX + originalUrl);
    }

    // Stage 1 Failed (Direct Douban or Proxy Load)
    if (retryStage === 1) {
        // If it was a direct Douban load failure, try Proxy
        if (imgSrc === originalUrl && originalUrl.includes('doubanio.com')) {
             const proxyUrl = `${PROXY_URL}${encodeURIComponent(originalUrl)}`;
             setImgSrc(proxyUrl);
             // We remain in stage 1 effectively, just retrying with proxy. 
             // If this proxy attempt fails, handleError will trigger again.
             // We need to ensure we don't loop. 
             // Since setImgSrc changes the src, the next error will be for the proxy URL.
             return;
        }
        
        // If proxy failed (or we just tried proxy for non-douban), try smart search
        if (searchKeyword) {
            setRetryStage(2);
            getDoubanPoster(searchKeyword).then(newUrl => {
                if (newUrl) {
                    if (newUrl.includes('doubanio.com')) {
                        setImgSrc(newUrl); // Try direct for new found URL
                    } else {
                        const proxyUrl = `${PROXY_URL}${encodeURIComponent(newUrl)}`;
                        setImgSrc(proxyUrl);
                    }
                } else {
                    setImgSrc(FALLBACK_IMG);
                    setRetryStage(3);
                }
            });
        } else {
            setImgSrc(FALLBACK_IMG);
            setRetryStage(3);
        }
    } 
    // Stage 2 Failed (Smart Search Result Failed)
    else if (retryStage === 2) {
        if (imgSrc !== FALLBACK_IMG) {
            setImgSrc(FALLBACK_IMG);
            setRetryStage(3);
        }
    }
  };

  const handleLoad = () => {
      if (imgSrc !== FALLBACK_IMG && src) {
          let originalUrl = src.trim();
          if (originalUrl.startsWith('//')) originalUrl = 'https:' + originalUrl;
          try {
              if (originalUrl && !BAD_IMAGE_PATTERNS.some(p => originalUrl.includes(p))) {
                  // Only cache if successful. Note: We cache the *working* imgSrc (which might be proxy) 
                  // mapped to originalUrl key.
                  localStorage.setItem(CACHE_PREFIX + originalUrl, imgSrc);
              }
          } catch (e) {}
      }
  };

  return (
    <img 
      src={imgSrc} 
      alt={alt || "Poster"} 
      className={`${className} ${imgSrc === FALLBACK_IMG ? 'opacity-50 grayscale p-4 bg-gray-900' : 'bg-gray-800'}`}
      onError={handleError}
      onLoad={handleLoad}
      referrerPolicy="no-referrer" 
      loading="lazy"
      {...props} 
    />
  );
};

export default ImageWithFallback;