import { useEffect, useState } from 'react';
import { registerActionOverlayTrigger } from '../utils/actionOverlay';

export default function ClickSpinner() {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState('');

  useEffect(() => {
    let timer = null;

    const trigger = (actionLabel = '') => {
      setLabel(actionLabel);
      setVisible(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setVisible(false);
      }, 1800);
    };

    registerActionOverlayTrigger(trigger);
    return () => {
      if (timer) clearTimeout(timer);
      registerActionOverlayTrigger(null);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="action-overlay" role="status" aria-live="polite">
      <div className="action-overlay-card">
        <strong>{label || 'Working'}</strong>
        <small>Please wait</small>
      </div>
    </div>
  );
}
