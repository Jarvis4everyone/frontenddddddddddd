import { useEffect, useState, memo } from 'react';
import './AnimatedBackground.css';

const GIF_URLS = [
  'https://raw.githubusercontent.com/Jarvis4everyone/materials/main/1.gif',
  'https://raw.githubusercontent.com/Jarvis4everyone/materials/main/2.gif',
  'https://raw.githubusercontent.com/Jarvis4everyone/materials/main/3.gif',
  'https://raw.githubusercontent.com/Jarvis4everyone/materials/main/4.gif',
  'https://raw.githubusercontent.com/Jarvis4everyone/materials/main/5.gif',
  'https://raw.githubusercontent.com/Jarvis4everyone/materials/main/6.gif',
  'https://raw.githubusercontent.com/Jarvis4everyone/materials/main/7.gif',
  'https://raw.githubusercontent.com/Jarvis4everyone/materials/main/8.gif',
  'https://raw.githubusercontent.com/Jarvis4everyone/materials/main/9.gif',
];

const AnimatedBackground = memo(function AnimatedBackground({ disableGif = false }) {
  const [currentGifIndex, setCurrentGifIndex] = useState(0);

  useEffect(() => {
    if (disableGif) return;

    // Preload next 2 GIFs only for better performance
    const preloadNext = (index) => {
      const nextIndex = (index + 1) % GIF_URLS.length;
      const nextNextIndex = (index + 2) % GIF_URLS.length;
      [GIF_URLS[nextIndex], GIF_URLS[nextNextIndex]].forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    };

    // Preload initial GIFs
    preloadNext(0);

    // Rotate GIFs every 15 seconds (reduced frequency for better performance)
    const gifInterval = setInterval(() => {
      setCurrentGifIndex((prev) => {
        const next = (prev + 1) % GIF_URLS.length;
        preloadNext(next);
        return next;
      });
    }, 15000);

    return () => clearInterval(gifInterval);
  }, [disableGif]);

  return (
    <>
      <div
        className={`animated-bg-layer ${disableGif ? 'bg-modern-light' : 'bg-dynamic-gif'}`}
        style={{
          backgroundImage: disableGif ? undefined : `url(${GIF_URLS[currentGifIndex]})`,
        }}
      />
      <div
        className="animated-bg-overlay"
        style={{ opacity: disableGif ? 0.4 : 0.5 }}
      />
      <div className="animated-bg-grid" />
    </>
  );
});

export default AnimatedBackground;

