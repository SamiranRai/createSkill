import { getDownloadUrl } from "../api/jobs.api.js";

const DownloadPanel = ({ jobId, status }) => {
  if (status !== "complete") return null;

  const skillUrl = getDownloadUrl(jobId, "skill");

  return (
    <div className="card">
      <a
        className="download-button primary"
        href={skillUrl}
        target="_blank"
        rel="noreferrer"
      >
        ↓ Download SKILL.md
        <div className="download-sub">
          Agent-ready knowledge file that mirrors the speaker.
        </div>
      </a>
    </div>
  );
};

export default DownloadPanel;
