import { useEffect } from 'react';

export default function useDashboardHeaderBackground(imagePath = '/dashboard-header-bg.jpg') {
  useEffect(() => {
    const applyHeaderBg = () => {
      const candidates = Array.from(document.querySelectorAll('section, div, header, article'));
      const bannerEl = candidates.find((el) => {
        const text = el.textContent || '';
        const hasBannerText = text.includes('Batloung Farm') && text.includes('Fresh Fruits. Better Tomorrow.');
        if (!hasBannerText) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 250 && rect.height >= 80 && rect.height <= 450;
      });

      if (!bannerEl) return null;

      const prev = {
        backgroundImage: bannerEl.style.backgroundImage,
        backgroundSize: bannerEl.style.backgroundSize,
        backgroundPosition: bannerEl.style.backgroundPosition,
        backgroundRepeat: bannerEl.style.backgroundRepeat,
        overflow: bannerEl.style.overflow,
      };

      bannerEl.style.backgroundImage = `linear-gradient(90deg, rgba(255, 248, 238, 0.55) 0%, rgba(255, 244, 230, 0.30) 55%, rgba(255, 244, 230, 0.18) 100%), url("${imagePath}")`;
      bannerEl.style.backgroundSize = 'cover';
      bannerEl.style.backgroundPosition = 'center';
      bannerEl.style.backgroundRepeat = 'no-repeat';
      bannerEl.style.overflow = 'hidden';

      return { bannerEl, prev };
    };

    let applied = applyHeaderBg();
    const observer = new MutationObserver(() => {
      if (!applied) applied = applyHeaderBg();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (applied?.bannerEl && applied?.prev) {
        applied.bannerEl.style.backgroundImage = applied.prev.backgroundImage;
        applied.bannerEl.style.backgroundSize = applied.prev.backgroundSize;
        applied.bannerEl.style.backgroundPosition = applied.prev.backgroundPosition;
        applied.bannerEl.style.backgroundRepeat = applied.prev.backgroundRepeat;
        applied.bannerEl.style.overflow = applied.prev.overflow;
      }
    };
  }, [imagePath]);
}
