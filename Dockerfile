FROM node:lts-alpine

# Install system dependencies for canvas and sqlite3 (Alpine packages)
RUN apk add --no-cache \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    build-base \
    python3 \
    py3-setuptools \
    make \
    g++

WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi

COPY . .

ENV NODE_ENV=production

CMD ["node", "src/index.js"]