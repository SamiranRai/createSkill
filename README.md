# createSkill

createSkill converts any YouTube video into an agent-ready `SKILL.md` file that an AI agent can execute as if the speaker is advising you directly.

## Prerequisites
- Node.js 18+
- MongoDB instance/URI
- yt-dlp installed locally (`brew install yt-dlp` on macOS or use your preferred installer)
- Gemini API key

## Backend setup
1) `cd backend`
2) Copy env: `cp .env.example .env` and fill required values (`MONGODB_URI`, `GEMINI_API_KEY`)
3) Optional stage file for tests: create `.env.test` (loaded when `APP_STAGE=test`)
4) Optional values: `YT_DLP_PATH`, `YT_COOKIES_B64`, `RESIDENTIAL_PROXY_URL`, `PORT`, `APP_STAGE`
5) Install deps: `npm install`
6) Run server: `npm run dev` (or `npm start`)

## Frontend setup
1) `cd frontend`
2) Optional env: copy `cp .env.example .env` and set `VITE_API_URL` for a remote API
3) If `VITE_API_URL` is empty, frontend uses local `/api/v1` proxy from Vite
4) Install deps: `npm install`
5) Run app: `npm run dev` (Vite on port 5173; proxies API to backend)

## API endpoints
- `POST /api/v1/jobs` — body `{ youtubeUrl }`; creates a job
- `GET /api/v1/jobs/:jobId` — fetch job status/meta
- `GET /api/v1/jobs/:jobId/skill` — download generated `SKILL.md`

Once both servers are running, open `http://localhost:5173`, paste a YouTube URL, and download the generated skill file when complete.
