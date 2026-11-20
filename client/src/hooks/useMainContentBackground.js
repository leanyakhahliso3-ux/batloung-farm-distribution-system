import { useEffect } from 'react';

export default function useMainContentBackground(imagePath = '/fruit-bg.jpg') {
  useEffect(() => {
    const mainEl =
      document.querySelector('main') ||
      document.querySelector('.main-content') ||
      document.querySelector('[class*="main"]');

    if (!mainEl) return;

    const prevBgImage = mainEl.style.backgroundImage;
    const prevBgSize = mainEl.style.backgroundSize;
    const prevBgPosition = mainEl.style.backgroundPosition;
    const prevBgRepeat = mainEl.style.backgroundRepeat;
    const prevBgAttachment = mainEl.style.backgroundAttachment;

    mainEl.style.backgroundImage = `linear-gradient(rgba(255, 244, 230, 0.84), rgba(255, 244, 230, 0.84)), url("${imagePath}")`;
    mainEl.style.backgroundSize = 'cover';
    mainEl.style.backgroundPosition = 'center';
    mainEl.style.backgroundRepeat = 'no-repeat';
    mainEl.style.backgroundAttachment = 'fixed';

    return () => {
      mainEl.style.backgroundImage = prevBgImage;
      mainEl.style.backgroundSize = prevBgSize;
      mainEl.style.backgroundPosition = prevBgPosition;
      mainEl.style.backgroundRepeat = prevBgRepeat;
      mainEl.style.backgroundAttachment = prevBgAttachment;
    };
  }, [imagePath]);
}
