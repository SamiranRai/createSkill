const steps = [
  { key: "fetching_transcript", title: "Learning from the Video" },
  { key: "cleaning", title: "Structuring the Knowledge" },
  { key: "extracting_skill", title: "Generating Agent Skill" },
  { key: "complete", title: "Skill Ready" },
];

const ProgressSteps = ({ status, failureStage }) => {
  const failed = status === "failed";
  const statusKey = failed && failureStage ? failureStage : status;
  const currentIndex = steps.findIndex((step) => step.key === statusKey);
  const fallbackIndex =
    status === "complete"
      ? steps.length
      : currentIndex === -1
        ? 0
        : currentIndex;
  const beforeStart = status === "pending";

  return (
    <div className="card stepper">
      {steps.map((step, idx) => {
        const isFailed = failed && idx === fallbackIndex;
        const isCompleted = !failed && !beforeStart && idx < fallbackIndex;
        const isActive = !failed && !beforeStart && idx === fallbackIndex;
        const indicator = isCompleted ? "✓" : idx + 1;

        return (
          <div
            key={step.key}
            className={`step${isActive ? " active" : ""}${isCompleted ? " completed" : ""}${
              isFailed ? " failed" : ""
            }`}
          >
            <div
              className={`step-number${isActive ? " pulse-dot" : ""}${isCompleted ? " check" : ""}${isFailed ? " failed" : ""}`}
            >
              {indicator}
            </div>
            <div className="step-label">
              <div className="step-title">{step.title}</div>
              <div className="step-status">
                {isFailed
                  ? "Failed"
                  : isActive
                    ? "In progress"
                    : isCompleted
                      ? "Done"
                      : "Pending"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProgressSteps;
