import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

export const runtime = "nodejs";

const DATA_DIR_PATH = path.join(process.cwd(), "src", "data");
const DATA_FILE_PATH = path.join(DATA_DIR_PATH, "selections.json");

const SelectionSchema = z.object({
	id: z.string().min(1),
	start: z.number().nonnegative(),
	end: z.number().gt(z.number().nonnegative()),
	label: z.string().optional(),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
});

const SelectionsPayloadSchema = z.object({
	selections: z.array(SelectionSchema),
});

async function ensureDataFileExists(): Promise<void> {
	try {
		await fs.mkdir(DATA_DIR_PATH, { recursive: true });
		await fs.access(DATA_FILE_PATH);
	} catch (_) {
		await fs.writeFile(DATA_FILE_PATH, JSON.stringify({ selections: [] }, null, 2), "utf-8");
	}
}

async function readSelections(): Promise<z.infer<typeof SelectionsPayloadSchema>> {
	await ensureDataFileExists();
	const raw = await fs.readFile(DATA_FILE_PATH, "utf-8");
	try {
		const parsed = JSON.parse(raw);
		const result = SelectionsPayloadSchema.safeParse(parsed);
		if (!result.success) {
			return { selections: [] };
		}
		return result.data;
	} catch {
		return { selections: [] };
	}
}

async function writeSelections(payload: z.infer<typeof SelectionsPayloadSchema>): Promise<void> {
	await ensureDataFileExists();
	await fs.writeFile(DATA_FILE_PATH, JSON.stringify(payload, null, 2), "utf-8");
}

export async function GET() {
	const data = await readSelections();
	return NextResponse.json(data, { status: 200 });
}

export async function PUT(req: NextRequest) {
	try {
		const body = await req.json();
		const parseResult = SelectionsPayloadSchema.safeParse(body);
		if (!parseResult.success) {
			return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
		}

		const nowIso = new Date().toISOString();
		const incoming = parseResult.data.selections.map((s) => ({
			...s,
			createdAt: s.createdAt ?? nowIso,
			updatedAt: nowIso,
		}));

		await writeSelections({ selections: incoming });
		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: "Failed to update selections" }, { status: 500 });
	}
} 