const statusText = {
  pending: "Starting up...",
  fetching_transcript: "Extracting transcript from video...",
  cleaning: "Preserving every idea the speaker shared...",
  extracting_skill: "Building your agent-ready SKILL.md...",
  complete: "Knowledge extracted successfully",
};

const layerLabels = {
  layer1_youtube: "YouTube Captions",
  layer2_assemblyai: "AssemblyAI",
};

const JobStatus = ({ status, successfulLayer, processingMs, error }) => {
  const display =
    status === "failed"
      ? error?.message || "Job failed"
      : statusText[status] || "";
  const pulseClass =
    status === "complete"
      ? "pulse success"
      : status === "failed"
        ? "pulse error"
        : "pulse";
  const seconds = processingMs ? Math.round(processingMs / 100) / 10 : null;

  return (
    <div className="card status-card">
      <div className="status-main">
        <span className={pulseClass} />
        <span>{display}</span>
      </div>
      <div className="badges">
        {successfulLayer && (
          <span className="badge">
            Transcript: {layerLabels[successfulLayer] || successfulLayer}
          </span>
        )}
        {status === "complete" && seconds ? (
          <span className="badge">Processed in {seconds}s</span>
        ) : null}
      </div>
    </div>
  );
};

export default JobStatus;
