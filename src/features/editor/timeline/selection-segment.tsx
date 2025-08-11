"use client";

import React from "react";
import { timeMsToUnits, unitsToTimeMs } from "../utils/timeline";
import { usePointerDrag } from "../hooks/use-pointer-drag";

const MIN_DURATION_SEC = 0.1;

export interface SelectionEntry {
  name: string;
  start: number; // seconds
  end: number;   // seconds
}

export default function SelectionSegment(props: {
  item: SelectionEntry;
  prev?: SelectionEntry;
  next?: SelectionEntry;
  scrollLeft: number;
  leftBase: number;
  scaleZoom: number;
  onUpdate: (name: string, nextStart?: number, nextEnd?: number) => void;
}) {
  const { item, prev, next, scrollLeft, leftBase, scaleZoom, onUpdate } = props;

  const startMs = item.start * 1000;
  const endMs = item.end * 1000;
  const startUnits = timeMsToUnits(startMs, scaleZoom);
  const widthUnits = timeMsToUnits(endMs - startMs, scaleZoom);

  const leftPx = leftBase + startUnits - scrollLeft;
  const widthPx = Math.max(2, widthUnits);

  // Drag whole segment (like text timeline)
  const middleDrag = usePointerDrag<undefined>({
    pointerDownPreventDefault: true,
    pointerDownStopPropagation: true,
    onMove: ({ deltaX }) => {
      // Convert deltaX (units) to seconds
      const deltaSec = unitsToTimeMs(deltaX, scaleZoom) / 1000;
      const durationSec = Math.max(MIN_DURATION_SEC, item.end - item.start);

      // Allowed window
      const minStart = prev ? prev.end : 0;
      const maxEnd = next ? next.start : Number.POSITIVE_INFINITY;

      // Clamp delta so the moved segment stays within [minStart, maxEnd]
      const minDelta = minStart - item.start;
      const maxDelta = maxEnd - item.end;
      const clampedDelta = Math.min(Math.max(deltaSec, minDelta), maxDelta);

      const newStart = item.start + clampedDelta;
      const newEnd = newStart + durationSec;
      onUpdate(item.name, newStart, newEnd);
    },
  });

  const leftDrag = usePointerDrag<{ initStartUnits: number } | undefined>({
    pointerDownPreventDefault: true,
    pointerDownStopPropagation: true,
    onStart: ({ setState }) => setState({ initStartUnits: startUnits }),
    onMove: ({ deltaX, state }) => {
      if (!state) return;
      const proposedStartUnits = Math.max(0, state.initStartUnits + deltaX);
      const proposedStartMs = unitsToTimeMs(proposedStartUnits, scaleZoom);
      let proposedStartSec = proposedStartMs / 1000;
      const minStart = prev ? prev.end : 0;
      const maxStart = Math.max(item.end - MIN_DURATION_SEC, minStart);
      proposedStartSec = Math.min(Math.max(proposedStartSec, minStart), maxStart);
      onUpdate(item.name, proposedStartSec, undefined);
    },
  });

  const rightDrag = usePointerDrag<{ initEndUnits: number } | undefined>({
    pointerDownPreventDefault: true,
    pointerDownStopPropagation: true,
    onStart: ({ setState }) => setState({ initEndUnits: startUnits + widthUnits }),
    onMove: ({ deltaX, state }) => {
      if (!state) return;
      const proposedEndUnits = Math.max(0, state.initEndUnits + deltaX);
      const proposedEndMs = unitsToTimeMs(proposedEndUnits, scaleZoom);
      let proposedEndSec = proposedEndMs / 1000;
      const maxEnd = next ? next.start : Number.POSITIVE_INFINITY;
      const minEnd = Math.max(item.start + MIN_DURATION_SEC, 0);
      proposedEndSec = Math.max(Math.min(proposedEndSec, maxEnd), minEnd);
      onUpdate(item.name, undefined, proposedEndSec);
    },
  });

  return (
    <div
      {...(middleDrag as any).dragProps?.()}
      style={{
        position: "absolute",
        left: leftPx,
        top: 0,
        width: widthPx,
        height: 87,
        background: "rgba(126, 18, 255, 0.25)",
        border: "1px solid rgba(126, 18, 255, 0.9)",
        borderRadius: 4,
        pointerEvents: "auto",
        cursor: "grab",
      }}
    >
      <div
        {...(leftDrag as any).dragProps?.()}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 6,
          height: "100%",
          cursor: "ew-resize",
          background: "rgba(126, 18, 255, 0.5)",
          borderTopLeftRadius: 4,
          borderBottomLeftRadius: 4,
        }}
      />
      <div
        {...(rightDrag as any).dragProps?.()}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: 6,
          height: "100%",
          cursor: "ew-resize",
          background: "rgba(126, 18, 255, 0.5)",
          borderTopRightRadius: 4,
          borderBottomRightRadius: 4,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 8,
          color: "#fff",
          fontSize: 12,
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {item.name}
      </div>
    </div>
  );
} 