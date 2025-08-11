"use client";

import React, { useMemo, useCallback } from "react";
import { useSelectionStore } from "@/store/use-selection-store";
import useStore from "../store/use-store";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "../constants/constants";
import SelectionSegment, { SelectionEntry } from "./selection-segment";

export default function SelectionOverlay({ scrollLeft }: { scrollLeft: number }) {
  const { activeGroup, setActiveGroup } = useSelectionStore();
  const { scale } = useStore();

  const entries = useMemo(() => {
    if (!activeGroup) return [] as SelectionEntry[];
    return Object.entries(activeGroup.timeframes)
      .map(([name, v]) => ({ name, start: v.start, end: v.end }))
      .sort((a, b) => a.start - b.start);
  }, [activeGroup]);

  const leftBase = TIMELINE_OFFSET_CANVAS_LEFT;

  const updateGroup = useCallback(
    (name: string, nextStart?: number, nextEnd?: number) => {
      if (!activeGroup) return;
      const tf = { ...activeGroup.timeframes };
      const current = tf[name];
      if (!current) return;
      tf[name] = {
        start: nextStart !== undefined ? nextStart : current.start,
        end: nextEnd !== undefined ? nextEnd : current.end,
      };
      setActiveGroup({ ...activeGroup, timeframes: tf });
    },
    [activeGroup, setActiveGroup],
  );

  if (!activeGroup || entries.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 30,
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
        zIndex: 9,
      }}
    >
      {entries.map((item, idx) => (
        <SelectionSegment
          key={item.name}
          item={item}
          prev={entries[idx - 1]}
          next={entries[idx + 1]}
          scrollLeft={scrollLeft}
          leftBase={leftBase}
          scaleZoom={scale.zoom}
          onUpdate={updateGroup}
        />
      ))}
    </div>
  );
} 