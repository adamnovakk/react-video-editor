"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_SELECTION_API_BASE ?? "http://localhost:4000";

export interface SelectionGroupListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeframesMap {
  [name: string]: { start: number; end: number };
}

export interface SelectionGroupDetails extends SelectionGroupListItem {
  timeframes: TimeframesMap;
}

async function fetchSelectionGroups(): Promise<SelectionGroupListItem[]> {
  const res = await fetch(`${API_BASE}/api/selection-groups`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch selection groups");
  return res.json();
}

export function useSelectionGroups() {
  return useQuery({ queryKey: ["selection-groups"], queryFn: fetchSelectionGroups });
}

export async function fetchSelectionGroupById(id: string): Promise<SelectionGroupDetails> {
  const res = await fetch(`${API_BASE}/api/selection-groups/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch selection group");
  return res.json();
}

export async function createSelectionGroup(params: { name: string; timeframes: TimeframesMap }): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/selection-groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to create selection group");
  return res.json();
}

export async function updateSelectionGroup(id: string, params: { name?: string; timeframes: TimeframesMap }): Promise<void> {
  const res = await fetch(`${API_BASE}/api/selection-groups/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to update selection group");
} 