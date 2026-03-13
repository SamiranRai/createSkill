const ErrorBanner = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div className="card error-banner">
      <div className="error-text">{message}</div>
      {onDismiss && (
        <button
          className="close-button"
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
