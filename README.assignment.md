# Assignment Work Overview

This document summarizes the features and changes implemented for the test assignment, along with setup and usage instructions.

## What I Built

- Backend for timeframe selection groups (separate Express server)
  - Stores groups in a simple JSON DB (lowdb)
  - CRUD API with validation and no-overlap constraint
  - Data shape for timeframes matches the assignment:
    ```json
    {
      "episode 1": { "start": 0, "end": 93 },
      "episode 2": { "start": 121, "end": 312 }
    }
    ```
- Selection groups integration in the client
  - “Selection groups” button in "Your uploads" lists groups from the backend
  - Clicking a group loads it and seeks to the earliest segment
  - “Save selection group” dialog (shows only after a group is loaded); updates or creates a group by name
- Timeline overlay for editing selections
  - Colored segments rendered on top of the timeline
  - Drag left/right edges to adjust start/end, constrained so segments don’t overlap
  - Drag the whole segment (like text timeline) to reposition between neighbors
  - Background video strip remains in grayscale; selected/active area shows in color (when the item is selected)
- Timeline UX improvements
  - Increased timeline height and thumbnail size for better visibility
  - Zoom behavior centers around the playhead after zoom changes
  - Yellow play button: plays the current or next selection segment; pauses 0.5s at end, then jumps and plays the next segment
  - Keyboard shortcuts:
    - Space: toggle regular play/pause
    - Double Space: yellow play (segment-by-segment)
    - Cmd/Ctrl + Z: jump back to previous segment start (or 0 if none)
- Interaction limitations (as requested)
  - Disabled dragging to reorder parts
  - Disabled right-side “video” editor panel and border when clicking on a video (scene selection by click is off)

## Backend Setup (Express + lowdb)

- Location: `server/`
- Start the server (port 4000 by default):
  ```bash
  pnpm install
  pnpm run server
  ```
- Data file: `server/data/selection-groups.json`

### API Endpoints

- List groups
  - GET `/api/selection-groups`
  - Response: `[ { id, name, createdAt, updatedAt } ]`
- Get group by id
  - GET `/api/selection-groups/:id`
  - Response:
    ```json
    {
      "id": "...",
      "name": "Demo Group",
      "timeframes": {
        "episode 1": { "start": 0, "end": 93 },
        "episode 2": { "start": 121, "end": 312 }
      }
    }
    ```
- Create group
  - POST `/api/selection-groups`
  - Body: `{ "name": "...", "timeframes": { <map> } }`
- Update group
  - PUT `/api/selection-groups/:id`
  - Body: `{ "name?": "...", "timeframes": { <map> } }`
  - Validates that segments do not overlap

### Seeding Data

PowerShell:
```powershell
$body = @{
  name = "Demo Group"
  timeframes = @{
    "episode 1" = @{ start = 0; end = 93 }
    "episode 2" = @{ start = 121; end = 312 }
  }
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://localhost:4000/api/selection-groups -Method Post -Body $body -ContentType "application/json"
```

curl:
```bash
curl -s -X POST http://localhost:4000/api/selection-groups \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Demo Group",
    "timeframes": {
      "episode 1": { "start":0, "end":93 },
      "episode 2": { "start":121, "end":312 }
    }
  }'
```

## Frontend Setup

- Client expects `NEXT_PUBLIC_SELECTION_API_BASE` in `.env.local`:
  ```env
  NEXT_PUBLIC_SELECTION_API_BASE=http://localhost:4000
  ```
- Start the Next.js app:
  ```bash
  pnpm install
  pnpm dev
  ```

## Using the Features

1) Open "Your uploads"
- Click “Selection groups”
- Choose a group; the player seeks to the group’s first segment

2) Edit selection segments
- Colored overlays appear on the timeline
- Drag left/right edges to adjust start/end; segments won’t overlap the next/previous
- Drag the middle of the bar to move the whole segment between neighbors

3) Save selection group
- After a group is loaded, “Save selection group” appears
- Click it, name (pre-filled if loaded), and Save to update or create

4) Playback & Shortcuts
- Yellow play button: plays current/next segment, pauses 0.5s at end, continues to next
- Space: toggle play/pause
- Double Space: yellow play
- Cmd/Ctrl + Z: jump back to previous segment start (or 0)

## Notes / Known Items

- Export functions are available in the codebase but integration to export per-segment was not merged in this iteration. If needed, I can wire up per-segment export to MP4 (H.264) using the existing `/api/render` endpoint by trimming the design payload.
- The QuickTime-style “hold to zoom” behavior on edge drag was explored; current build focuses on stable segment editing, zoom centering, and playback tools. It can be reintroduced if required.

## Tech Highlights

- Separate Express server for selection groups with lowdb persistence
- Zod validation and no-overlap checks
- React Query for fetching groups; Zustand stores for selections and editor state
- Canvas-based timeline with grayscale filmstrip base + color overlay when selected
- Accessible, responsive UI: buttons stack on narrow screens; full-width actions

---
If you want me to enable per-segment export and the precision “hold-to-zoom” interaction, I can add them quickly on top of this foundation. 