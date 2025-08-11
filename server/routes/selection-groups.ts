import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createGroup, getGroupById, listGroups, replaceGroup } from "../db";

const router = Router();

const TimeframeSchema = z.object({
  start: z.number().finite().min(0),
  end: z.number().finite().gt(0),
});

const TimeframesMapSchema = z.record(TimeframeSchema);

const CreateGroupSchema = z.object({
  name: z.string().min(1),
  timeframes: TimeframesMapSchema,
});

const UpdateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  timeframes: TimeframesMapSchema,
});

function assertNoOverlaps(tfMap: Record<string, { start: number; end: number }>) {
  const intervals = Object.entries(tfMap).map(([name, v]) => ({ name, start: v.start, end: v.end }));
  intervals.sort((a, b) => a.start - b.start);
  for (let i = 1; i < intervals.length; i++) {
    const prev = intervals[i - 1];
    const curr = intervals[i];
    if (curr.start < prev.end) {
      const msg = `Timeframe overlap between "${prev.name}" [${prev.start}, ${prev.end}) and "${curr.name}" [${curr.start}, ${curr.end})`;
      throw new Error(msg);
    }
  }
}

router.get("/", async (_req: Request, res: Response) => {
  const rows = await listGroups();
  res.json(rows);
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  const group = await getGroupById(id);
  if (!group) return res.status(404).json({ error: "Not found" });
  res.json(group);
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = CreateGroupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.format() });

  try {
    assertNoOverlaps(parsed.data.timeframes);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }

  const now = new Date().toISOString();
  const groupId = nanoid();

  await createGroup({ id: groupId, name: parsed.data.name, createdAt: now, updatedAt: now, timeframes: parsed.data.timeframes });

  res.status(201).json({ id: groupId });
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  const parsed = UpdateGroupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.format() });

  try {
    assertNoOverlaps(parsed.data.timeframes);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }

  const now = new Date().toISOString();
  const ok = await replaceGroup(id, { name: parsed.data.name, updatedAt: now, timeframes: parsed.data.timeframes });
  if (!ok) return res.status(404).json({ error: "Not found" });

  res.json({ success: true });
});

export default router; 