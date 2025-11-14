/**
 * Lightweight virtualization hook for large lists
 * Only renders visible items to reduce DOM nodes and memory usage
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseVirtualizedListOptions<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside visible area
  enabled?: boolean;
}

interface VirtualizedItem<T> {
  index: number;
  item: T;
  offset: number;
}

export function useVirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
  enabled = true,
}: UseVirtualizedListOptions<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!enabled || items.length === 0) {
      return { start: 0, end: items.length };
    }

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { start, end };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length, enabled]);

  // Get visible items
  const visibleItems = useMemo<VirtualizedItem<T>[]>(() => {
    if (!enabled) {
      return items.map((item, index) => ({
        index,
        item,
        offset: index * itemHeight,
      }));
    }

    const result: VirtualizedItem<T>[] = [];
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      result.push({
        index: i,
        item: items[i],
        offset: i * itemHeight,
      });
    }
    return result;
  }, [items, visibleRange, itemHeight, enabled]);

  // Total height of all items
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Scroll to item
  const scrollToItem = useCallback(
    (index: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = index * itemHeight;
      }
    },
    [itemHeight]
  );

  // Update scroll position when items change (maintain position)
  useEffect(() => {
    if (containerRef.current && scrollTop > 0) {
      // Maintain scroll position if possible
      const maxScroll = Math.max(0, totalHeight - containerHeight);
      if (scrollTop > maxScroll) {
        containerRef.current.scrollTop = maxScroll;
        setScrollTop(maxScroll);
      }
    }
  }, [items.length, totalHeight, containerHeight, scrollTop]);

  return {
    visibleItems,
    totalHeight,
    containerRef,
    handleScroll,
    scrollToItem,
    startIndex: visibleRange.start,
    endIndex: visibleRange.end,
  };
}

