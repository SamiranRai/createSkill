const VideoMeta = ({ videoMeta }) => {
  if (!videoMeta) return null;
  const hasInfo = videoMeta.title || videoMeta.author;
  if (!hasInfo) return null;

  const thumbnail =
    videoMeta.thumbnailUrl ||
    (videoMeta.videoId
      ? `https://img.youtube.com/vi/${videoMeta.videoId}/hqdefault.jpg`
      : null);

  return (
    <div className="card video-card">
      {thumbnail && (
        <img src={thumbnail} alt="Thumbnail" className="thumbnail" />
      )}
      <div>
        <div className="video-title">{videoMeta.title}</div>
        <div className="meta-author">{videoMeta.author}</div>
      </div>
    </div>
  );
};

export default VideoMeta;
