# createSkill

createSkill converts any YouTube video into an agent-ready `SKILL.md` file that an AI agent can execute as if the speaker is advising you directly.

## Prerequisites
- Node.js 18+
- MongoDB instance/URI
- yt-dlp installed locally (`brew install yt-dlp` on macOS or use your preferred installer)
- Gemini API key

## Backend setup
1) `cd backend`
2) Copy env: `cp .env.example .env` and fill `MONGODB_URI`, `GEMINI_API_KEY`, optional `YT_DLP_PATH`, and `PORT`
3) Install deps: `npm install`
4) Run server: `npm run dev` (or `npm start`)

## Frontend setup
1) `cd frontend`
2) Install deps: `npm install`
3) Run app: `npm run dev` (Vite on port 5173; proxies API to backend)

## API endpoints
- `POST /api/v1/jobs` — body `{ youtubeUrl }`; creates a job
- `GET /api/v1/jobs/:jobId` — fetch job status/meta
- `GET /api/v1/jobs/:jobId/skill` — download generated `SKILL.md`

Once both servers are running, open `http://localhost:5173`, paste a YouTube URL, and download the generated skill file when complete.
