import express from "express";
import cors from "cors";
import selectionGroupsRouter from "./routes/selection-groups";
import { migrate } from "./db";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/selection-groups", selectionGroupsRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

migrate()
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Selection Groups API listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to migrate DB:", err);
    process.exit(1);
  }); 