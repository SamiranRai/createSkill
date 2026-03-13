FROM node:22-slim

RUN apt-get update && apt-get install -y \
  python3 python3-pip ffmpeg curl \
  && pip3 install yt-dlp --break-system-packages \
  && apt-get clean

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["npm", "run", "start"]