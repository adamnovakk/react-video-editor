## Deployment Guide

### 1) Deploy the backend (selection groups API) on Render

- Repo root contains `render.yaml`. In Render, create a New > Blueprint, connect this repo.
- Service: `selection-groups-api`
  - Runtime: Node
  - Build command: `pnpm i --frozen-lockfile`
  - Start command: `pnpm run server`
  - Health check path: `/health`
  - Disk: attach persistent disk mounted at `/opt/render/project/src/server/data` (already defined in `render.yaml`)
  - Environment variable: `NODE_VERSION=20`
- After deploy, note the public base URL (e.g. `https://selection-groups-api.onrender.com`).

### 2) Deploy the frontend (Next.js app) on Vercel

- Import the GitHub repo into Vercel.
- Vercel will detect Next.js and pnpm from `pnpm-lock.yaml`.
- Set Project Environment Variables:
  - `NEXT_PUBLIC_SELECTION_API_BASE`: the Render backend URL from step 1
  - `PEXELS_API_KEY`: your Pexels API key
- Build/Deploy with defaults (or `pnpm install` / `pnpm build`).

### 3) Local envs for parity

Create `.env.local` with:

```
NEXT_PUBLIC_SELECTION_API_BASE=http://localhost:4000
PEXELS_API_KEY=YOUR_KEY
```

Start locally:

```
pnpm run server   # backend on :4000
pnpm dev          # frontend on :3000
```

### Notes

- The backend uses lowdb JSON at `server/data/selection-groups.json`. On Render, a persistent disk is mounted to keep data across deploys.
- CORS is enabled with `cors()` and is permissive by default; tighten it if needed.
- If deploying both on other providers (Railway/Fly/Docker), ensure `PORT` is provided and set the frontend env to the backend public URL. 