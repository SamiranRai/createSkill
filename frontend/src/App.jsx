import { useState, useCallback } from "react";
import { createJob } from "./api/jobs.api.js";
import useJobPoller from "./hooks/useJobPoller.js";
import UrlInput from "./components/UrlInput.jsx";
import JobStatus from "./components/JobStatus.jsx";
import ProgressSteps from "./components/ProgressSteps.jsx";
import VideoMeta from "./components/VideoMeta.jsx";
import DownloadPanel from "./components/DownloadPanel.jsx";
import ErrorBanner from "./components/ErrorBanner.jsx";

const App = () => {
  const [jobId, setJobId] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (youtubeUrl) => {
    setError(null);
    setLoading(true);
    try {
      const result = await createJob(youtubeUrl);
      setJobId(result.jobId);
      setJobData({ status: result.status, cached: result.cached });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdate = useCallback((data) => {
    setJobData(data);
  }, []);

  const handleComplete = useCallback((data) => {
    setJobData(data);
  }, []);

  const handleError = useCallback((message) => {
    setError(message);
  }, []);

  const reset = () => {
    setJobId(null);
    setJobData(null);
    setError(null);
  };

  useJobPoller({
    jobId,
    onUpdate: handleUpdate,
    onComplete: handleComplete,
    onError: handleError,
  });

  const status = jobData?.status || "pending";

  return (
    <>
      {/* <div className="server-status-banner" role="status" aria-live="polite">
        Note: Heavy traffic may cause file generation to fail. Please retry.
      </div> */}

      <div className="container">
        <header className="header">
          <button className="brand-btn" type="button" onClick={reset}>
            <span className="brand-title">createSkill</span>
            <span className="brand-tagline">
              Turn any YouTube video into an AI-agent ready skill - (skill.md)
            </span>
          </button>
          {jobId && (
            <button className="back-btn" type="button" onClick={reset}>
              ← New Video
            </button>
          )}
        </header>

        <div className="divider" />

        {error && (
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        )}

        {!jobId && <UrlInput onSubmit={handleSubmit} loading={loading} />}

        {jobId && (
          <>
            <JobStatus
              status={status}
              successfulLayer={jobData?.successfulLayer}
              processingMs={jobData?.processingMs}
              error={jobData?.error}
            />
            <ProgressSteps
              status={status}
              failureStage={jobData?.error?.failedAt}
            />
            <VideoMeta
              videoMeta={{ ...jobData?.videoMeta, videoId: jobData?.videoId }}
            />
            <DownloadPanel jobId={jobId} status={status} />
          </>
        )}
        <footer className="founder-info">
          <span>Built by Samiran 💛</span>
          <span aria-hidden="true"> · </span>
          <a
            className="founder-link"
            href="https://www.linkedin.com/in/samiranraii"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </footer>
      </div>
    </>
  );
};

export default App;
