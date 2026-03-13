'use strict'

const axios = require('axios')

const extractVideoId = (url) => {
  if (!url) return null

  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/(?:watch\\?v=|embed\/|shorts\/|v\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/.*[?&]v=([A-Za-z0-9_-]{11})/,
    /m\.youtube\.com\/.*[?&]v=([A-Za-z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) return match[1]
  }

  return null
}

const fetchVideoMeta = async (videoId) => {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const { data } = await axios.get(url)
    return {
      title: data?.title,
      author: data?.author_name,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    }
  } catch (err) {
    return {}
  }
}

module.exports = { extractVideoId, fetchVideoMeta }
