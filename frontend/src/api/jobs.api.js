const BASE = `${import.meta.env.VITE_API_URL}/api/v1/jobs`;
// const BASE = "/api/v1/jobs";
export const createJob = async (youtubeUrl) => {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ youtubeUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create job");
  return data.data;
};

export const getJob = async (jobId) => {
  const res = await fetch(`${BASE}/${jobId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch job");
  return data.data;
};

export const getSkillUrl = (jobId) => `${BASE}/${jobId}/skill`;

export const getDownloadUrl = (jobId, type = "skill") => {
  if (type === "skill") return getSkillUrl(jobId);
  return `${BASE}/${jobId}/${type}`;
};
