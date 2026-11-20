import { useEffect, useId, useRef } from 'react';

export default function Modal({ title, onClose, children, footer }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-panel">
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="modal-close"
            data-no-overlay="true"
            onClick={onClose}
            aria-label="Close details"
          >
            Close
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
