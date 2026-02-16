import React, { useRef, useState, useCallback, useEffect } from 'react';

const MIN_CROP_PX = 40;

/**
 * Visual crop overlay on video. Displays a draggable/resizable rectangle (crop region).
 * Value is in source video pixels: { x, y, width, height }.
 * Props: videoWidth, videoHeight, crop { x, y, width, height }, onChange(crop), className
 */
export default function CropResizeFrame({ videoWidth, videoHeight, crop, onChange, className = '' }) {
  const wrapRef = useRef(null);
  const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 });
  const dragRef = useRef({ active: false, mode: null, startX: 0, startY: 0, startCrop: null });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setWrapSize({ w: rect.width, h: rect.height });
    };
    update();
    const ro = window.ResizeObserver ? new ResizeObserver(update) : null;
    if (ro) ro.observe(el);
    return () => ro?.disconnect();
  }, []);

  const toDisplay = useCallback((x, y, w, h) => {
    if (!videoWidth || !videoHeight || !wrapSize.w || !wrapSize.h) return { left: 0, top: 0, width: 0, height: 0 };
    const scaleX = wrapSize.w / videoWidth;
    const scaleY = wrapSize.h / videoHeight;
    return {
      left: (x / videoWidth) * wrapSize.w,
      top: (y / videoHeight) * wrapSize.h,
      width: (w / videoWidth) * wrapSize.w,
      height: (h / videoHeight) * wrapSize.h,
    };
  }, [videoWidth, videoHeight, wrapSize.w, wrapSize.h]);

  const toSource = useCallback((left, top, width, height) => {
    if (!videoWidth || !videoHeight || !wrapSize.w || !wrapSize.h) return crop;
    const scaleX = videoWidth / wrapSize.w;
    const scaleY = videoHeight / wrapSize.h;
    return {
      x: Math.max(0, Math.min(Math.round(left * scaleX), videoWidth - 1)),
      y: Math.max(0, Math.min(Math.round(top * scaleY), videoHeight - 1)),
      width: Math.max(1, Math.min(Math.round(width * scaleX), videoWidth)),
      height: Math.max(1, Math.min(Math.round(height * scaleY), videoHeight)),
    };
  }, [videoWidth, videoHeight, wrapSize.w, wrapSize.h, crop]);

  if (!videoWidth || !videoHeight || !crop) return null;

  const { left, top, width, height } = toDisplay(crop.x, crop.y, crop.width, crop.height);

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target;
    const isLeft = target.dataset?.handle === 'left';
    const isRight = target.dataset?.handle === 'right';
    const isTop = target.dataset?.handle === 'top';
    const isBottom = target.dataset?.handle === 'bottom';
    const isCorner = target.dataset?.handle?.startsWith('corner');
    let mode = 'move';
    if (isLeft || isRight || isTop || isBottom || isCorner) mode = 'resize';
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    dragRef.current = {
      active: true,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
      handle: target.dataset?.handle,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.active) return;
    e.preventDefault();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const scaleX = videoWidth / wrapSize.w;
    const scaleY = videoHeight / wrapSize.h;
    const dxSrc = dx * scaleX;
    const dySrc = dy * scaleY;
    let next = { ...dragRef.current.startCrop };

    if (dragRef.current.mode === 'move') {
      next.x = Math.max(0, Math.min(dragRef.current.startCrop.x + dxSrc, videoWidth - next.width));
      next.y = Math.max(0, Math.min(dragRef.current.startCrop.y + dySrc, videoHeight - next.height));
    } else {
      const h = dragRef.current.handle;
      if (h === 'left' || h === 'corner-tl' || h === 'corner-bl') {
        const newX = Math.max(0, Math.min(dragRef.current.startCrop.x + dxSrc, dragRef.current.startCrop.x + dragRef.current.startCrop.width - 1));
        next.width = next.width + (next.x - newX);
        next.x = newX;
      }
      if (h === 'right' || h === 'corner-tr' || h === 'corner-br') {
        next.width = Math.max(1, Math.min(dragRef.current.startCrop.width + dxSrc, videoWidth - next.x));
      }
      if (h === 'top' || h === 'corner-tl' || h === 'corner-tr') {
        const newY = Math.max(0, Math.min(dragRef.current.startCrop.y + dySrc, dragRef.current.startCrop.y + dragRef.current.startCrop.height - 1));
        next.height = next.height + (next.y - newY);
        next.y = newY;
      }
      if (h === 'bottom' || h === 'corner-bl' || h === 'corner-br') {
        next.height = Math.max(1, Math.min(dragRef.current.startCrop.height + dySrc, videoHeight - next.y));
      }
    }

    next.width = Math.max(1, Math.min(next.width, videoWidth - next.x));
    next.height = Math.max(1, Math.min(next.height, videoHeight - next.y));
    next.x = Math.max(0, Math.min(next.x, videoWidth - next.width));
    next.y = Math.max(0, Math.min(next.y, videoHeight - next.height));
    onChange(next);
  };

  const handlePointerUp = (e) => {
    dragRef.current.active = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
  };

  return (
    <div
      ref={wrapRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ aspectRatio: videoWidth / videoHeight, maxWidth: '100%', maxHeight: '100%' }}
    >
      {/* Dark overlay panels around crop window */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-0 top-0 right-0 bg-black/50" style={{ height: `${top}px` }} />
        <div className="absolute left-0 bottom-0 right-0 bg-black/50" style={{ height: `${wrapSize.h - (top + height)}px` }} />
        <div className="absolute left-0 bg-black/50" style={{ top: `${top}px`, width: `${left}px`, height: `${height}px` }} />
        <div className="absolute right-0 bg-black/50" style={{ top: `${top}px`, width: `${wrapSize.w - (left + width)}px`, height: `${height}px` }} />
      </div>
      {/* Crop selection box - draggable and resizable */}
      <div
        className="absolute border-2 border-[#ff914c] border-dashed box-border pointer-events-auto cursor-move"
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Edge handles */}
        <div data-handle="left" className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize -ml-1" style={{ touchAction: 'none' }} />
        <div data-handle="right" className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize -mr-1" style={{ touchAction: 'none' }} />
        <div data-handle="top" className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize -mt-1" style={{ touchAction: 'none' }} />
        <div data-handle="bottom" className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize -mb-1" style={{ touchAction: 'none' }} />
        {/* Corner handles */}
        <div data-handle="corner-tl" className="absolute -top-1 -left-1 w-3 h-3 bg-[#ff914c] rounded-sm cursor-nwse-resize" />
        <div data-handle="corner-tr" className="absolute -top-1 -right-1 w-3 h-3 bg-[#ff914c] rounded-sm cursor-nesw-resize" />
        <div data-handle="corner-bl" className="absolute -bottom-1 -left-1 w-3 h-3 bg-[#ff914c] rounded-sm cursor-nesw-resize" />
        <div data-handle="corner-br" className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#ff914c] rounded-sm cursor-nwse-resize" />
      </div>
    </div>
  );
}
