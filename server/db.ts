import path from "path";
import fs from "fs";
import { JSONFilePreset } from "lowdb/node";
import { SelectionGroupsTable, TimeframeMap } from "./schema";

const DB_DIR = path.join(process.cwd(), "server", "data");
const DB_FILE = path.join(DB_DIR, "selection-groups.json");

export interface DatabaseData {
  selection_groups: SelectionGroupsTable[];
}

let dbPromise: ReturnType<typeof JSONFilePreset<DatabaseData>> | null = null;

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export async function getDb() {
  if (!dbPromise) {
    ensureDirExists(DB_DIR);
    const defaultData: DatabaseData = { selection_groups: [] };
    dbPromise = JSONFilePreset<DatabaseData>(DB_FILE, defaultData);
  }
  return dbPromise;
}

export async function migrate() {
  await getDb();
}

export async function listGroups() {
  const db = await getDb();
  return db.data.selection_groups
    .map((g) => ({ id: g.id, name: g.name, createdAt: g.created_at, updatedAt: g.updated_at }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getGroupById(id: string) {
  const db = await getDb();
  const group = db.data.selection_groups.find((g) => g.id === id);
  if (!group) return null;
  return {
    id: group.id,
    name: group.name,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    timeframes: group.timeframes,
  };
}

export async function createGroup(params: { id: string; name: string; createdAt: string; updatedAt: string; timeframes: TimeframeMap }) {
  const db = await getDb();
  db.data.selection_groups.push({ id: params.id, name: params.name, created_at: params.createdAt, updated_at: params.updatedAt, timeframes: params.timeframes });
  await db.write();
}

export async function replaceGroup(id: string, params: { name?: string; updatedAt: string; timeframes: TimeframeMap }): Promise<boolean> {
  const db = await getDb();
  const group = db.data.selection_groups.find((g) => g.id === id);
  if (!group) return false;
  if (params.name) group.name = params.name;
  group.updated_at = params.updatedAt;
  group.timeframes = params.timeframes;
  await db.write();
  return true;
} 