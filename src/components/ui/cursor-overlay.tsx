'use client';

import * as React from 'react';

import {
  type CursorData,
  type CursorOverlayState,
  useCursorOverlay,
} from '@platejs/selection/react';
import { RangeApi } from 'platejs';
import { usePluginOption } from 'platejs/react';

import { cn } from '@/lib/utils';

export function CursorOverlay() {
  const { cursors } = useCursorOverlay();

  return (
    <>
      {cursors.map((cursor) => (
        <Cursor key={cursor.id} {...cursor} />
      ))}
    </>
  );
}

const Cursor = React.memo(function Cursor({
  id,
  caretPosition,
  data,
  selection,
  selectionRects,
}: CursorOverlayState<CursorData>) {
  const { style, selectionStyle = style } = data ?? ({} as CursorData);
  const isCursor = RangeApi.isCollapsed(selection);

  return (
    <>
      {selectionRects.map((position, i) => {
        return (
          <div
            key={i}
            className={cn(
              'pointer-events-none absolute z-10',
              id === 'selection' && 'bg-brand/25',
              id === 'selection' && isCursor && 'bg-primary'
            )}
            style={{
              ...selectionStyle,
              ...position,
            }}
          />
        );
      })}
      {caretPosition && (
        <div
          className={cn(
            'pointer-events-none absolute z-10 w-0.5',
            id === 'drag' && 'w-px bg-brand'
          )}
          style={{ ...caretPosition, ...style }}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if position or selection actually changed
  return (
    prevProps.id === nextProps.id &&
    JSON.stringify(prevProps.caretPosition) === JSON.stringify(nextProps.caretPosition) &&
    JSON.stringify(prevProps.selectionRects) === JSON.stringify(nextProps.selectionRects)
  );
});
