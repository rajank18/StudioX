import React, { useRef, useState, useCallback } from 'react';

const formatTime = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Timeline for selecting start and end time (trim range).
 * Props: videoDuration, startTime, endTime, onChange({ startTime, endTime }), containerWidth (optional, from parent measure)
 */
export default function CropResizeTimeline({ videoDuration, startTime, endTime, onChange, className = '' }) {
  const timelineRef = useRef(null);
  const selectionRef = useRef(null);
  const leftHandleRef = useRef(null);
  const rightHandleRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const dragRef = useRef({ active: false, mode: null, startX: 0, startStart: 0, startEnd: 0 });
  const rafRef = useRef(null);
  const pendingRef = useRef(null);

  const duration = endTime - startTime;
  const minSelPx = 48;
  const selectionWidthPx = containerWidth && videoDuration
    ? Math.max(minSelPx, (duration / videoDuration) * containerWidth)
    : minSelPx;
  const maxLeftPx = Math.max(0, containerWidth - selectionWidthPx);
  const startLeftPx = containerWidth && videoDuration
    ? (startTime / videoDuration) * containerWidth
    : 0;
  const leftOverlayWidth = Math.max(0, startLeftPx);
  const rightOverlayWidth = Math.max(0, containerWidth - (startLeftPx + selectionWidthPx));

  React.useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const update = () => setContainerWidth(Math.floor(el.clientWidth || 0));
    update();
    const ro = window.ResizeObserver ? new ResizeObserver(update) : null;
    if (ro) ro.observe(el);
    else window.addEventListener('resize', update);
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', update);
    };
  }, [videoDuration]);

  const applyPending = useCallback(() => {
    if (pendingRef.current == null) return;
    const { startTime: s, endTime: e } = pendingRef.current;
    pendingRef.current = null;
    onChange({ startTime: s, endTime: e });
  }, [onChange]);

  const onPointerDown = (e) => {
    if (!timelineRef.current || !videoDuration) return;
    e.preventDefault();
    e.stopPropagation();
    let mode = 'move';
    if (leftHandleRef.current?.contains(e.target)) mode = 'left';
    else if (rightHandleRef.current?.contains(e.target)) mode = 'right';
    try { selectionRef.current?.setPointerCapture(e.pointerId); } catch (err) {}
    dragRef.current = { active: true, mode, startX: e.clientX, startStart: startTime, startEnd: endTime };
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.active || !containerWidth || !videoDuration) return;
    e.preventDefault();
    const dx = (e.clientX - dragRef.current.startX) / containerWidth * videoDuration;
    let newStart = dragRef.current.startStart;
    let newEnd = dragRef.current.startEnd;
    if (dragRef.current.mode === 'left') {
      newStart = Math.max(0, Math.min(dragRef.current.startStart + dx, endTime - 0.1));
      newEnd = Math.max(newStart + 0.1, endTime);
    } else if (dragRef.current.mode === 'right') {
      newEnd = Math.max(startTime + 0.1, Math.min(dragRef.current.startEnd + dx, videoDuration));
      newStart = Math.min(startTime, newEnd - 0.1);
    } else {
      const len = dragRef.current.startEnd - dragRef.current.startStart;
      newStart = Math.max(0, Math.min(dragRef.current.startStart + dx, videoDuration - len));
      newEnd = newStart + len;
    }
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        pendingRef.current = { startTime: newStart, endTime: newEnd };
        applyPending();
      });
    } else {
      pendingRef.current = { startTime: newStart, endTime: newEnd };
    }
  };

  const onPointerUp = (e) => {
    dragRef.current.active = false;
    try { selectionRef.current?.releasePointerCapture(e.pointerId); } catch (err) {}
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    applyPending();
  };

  const onTimelineClick = (e) => {
    if (!timelineRef.current || selectionRef.current?.contains(e.target)) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * videoDuration;
    const half = duration / 2;
    let newStart = Math.max(0, Math.min(x - half, videoDuration - duration));
    let newEnd = newStart + duration;
    if (newEnd > videoDuration) {
      newEnd = videoDuration;
      newStart = videoDuration - duration;
    }
    onChange({ startTime: newStart, endTime: newEnd });
  };

  if (!videoDuration || videoDuration <= 0) return null;

  return (
    <div className={className}>
      <div className="text-sm text-gray-700 mb-2 flex items-center justify-between">
        <span className="font-medium">
          Trim: {formatTime(startTime)} → {formatTime(endTime)} ({duration.toFixed(1)}s)
        </span>
        <span className="text-xs text-gray-500">Drag edges to resize · Drag center to move</span>
      </div>
      <div
        ref={timelineRef}
        onPointerDown={onTimelineClick}
        className="relative w-full h-20 rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
        style={{ userSelect: 'none', touchAction: 'none' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 top-0 bottom-0 bg-black/40" style={{ width: `${leftOverlayWidth}px` }} />
          <div className="absolute right-0 top-0 bottom-0 bg-black/40" style={{ width: `${rightOverlayWidth}px` }} />
        </div>
        <div
          ref={selectionRef}
          onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e); }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          role="slider"
          className="absolute top-1/2 -translate-y-1/2 h-14 rounded-lg shadow-lg flex items-center justify-center border-2 border-[#ff914c] bg-[#ff914c]/20 backdrop-blur-sm"
          style={{
            left: `${startLeftPx}px`,
            width: `${selectionWidthPx}px`,
            cursor: 'grab',
            touchAction: 'none',
            pointerEvents: 'auto',
          }}
        >
          <div
            ref={leftHandleRef}
            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-[#ff914c] hover:bg-[#e67a35] rounded-l flex items-center justify-center"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-white rounded" />
              <div className="w-0.5 h-4 bg-white rounded" />
            </div>
          </div>
          <div className="flex-1 text-center text-xs font-medium text-gray-800 pointer-events-none">
            {formatTime(startTime)} – {formatTime(endTime)}
          </div>
          <div
            ref={rightHandleRef}
            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-[#ff914c] hover:bg-[#e67a35] rounded-r flex items-center justify-center"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-white rounded" />
              <div className="w-0.5 h-4 bg-white rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
