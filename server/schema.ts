export interface TimeframeMap {
  [name: string]: { start: number; end: number };
}

export interface SelectionGroupsTable {
  id: string;
  name: string;
  created_at: string; // ISO string
  updated_at: string; // ISO string
  timeframes: TimeframeMap;
}

export interface DatabaseSchema {
  selection_groups: SelectionGroupsTable[];
} 