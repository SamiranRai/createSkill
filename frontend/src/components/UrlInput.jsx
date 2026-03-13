import { useState } from "react";

const isYoutubeUrl = (url) => {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("youtube") ||
      parsed.hostname.includes("youtu.be")
    );
  } catch (err) {
    return false;
  }
};

const UrlInput = ({ onSubmit, loading }) => {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError(null);
    const trimmedValue = value.trim();
    if (!isYoutubeUrl(trimmedValue)) {
      setLocalError("Please enter a valid YouTube URL.");
      return;
    }
    onSubmit?.(trimmedValue);
  };

  return (
    <form className="card input-card" onSubmit={handleSubmit}>
      <div className="label">Paste any YouTube URL</div>
      <div className="input-row">
        <input
          className="input"
          type="url"
          placeholder="Paste any YouTube URL..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
        />
        <button className="button primary" type="submit" disabled={loading}>
          Extract Knowledge →
        </button>
      </div>
      {localError && <div className="inline-error">{localError}</div>}
    </form>
  );
};

export default UrlInput;
