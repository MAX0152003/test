import React, { useRef, useState, useEffect, useCallback, ReactNode } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  maxHeight?: number | string;
  overscan?: number;
  className?: string;
  emptyState?: ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
}

/**
 * Lightweight, high-performance Virtualized List component.
 * Ideal for mobile screens, long notification feeds, audit logs, and schedule lists.
 * Only renders visible items + a configurable buffer (overscan) into the DOM.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  maxHeight = '500px',
  overscan = 4,
  className = '',
  emptyState = null,
  getItemKey
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  // Measure container height dynamically with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      setContainerHeight(el.clientHeight || 400);
    };

    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateHeight();
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalCount = items.length;

  if (totalCount === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  // Calculate visible range based on scroll offset
  const totalHeight = totalCount * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalCount - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems: { item: T; index: number; top: number }[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    if (items[i] !== undefined) {
      visibleItems.push({
        item: items[i],
        index: i,
        top: i * itemHeight
      });
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
        height: '100%',
        overflowY: 'auto',
        position: 'relative'
      }}
      className={`custom-scrollbar ${className}`}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          position: 'relative',
          width: '100%'
        }}
      >
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={getItemKey ? getItemKey(item, index) : index}
            style={{
              position: 'absolute',
              top: `${top}px`,
              left: 0,
              right: 0,
              height: `${itemHeight}px`
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
