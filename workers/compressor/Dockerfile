# The archive compressor's container. Built with the repository root as its context (see
# image_build_context in wrangler.jsonc); Dockerfile.dockerignore keeps that context small.
FROM node:24-slim

# tar is in the base image; zstd does the compression (app/data/TarZstdWriter.mjs).
RUN apt-get update \
  && apt-get install -y --no-install-recommends zstd \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# The same locked dependencies as the rest of the backend. Install scripts are skipped: the
# compressor only needs the S3 client and Sentry, not sharp's native setup.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY app ./app
COPY workers/compressor/container ./workers/compressor/container

USER node
ENV NODE_ENV=production
# Where the container serves its log lines to the Durable Object (container/logServer.mjs).
EXPOSE 8080
CMD ["node", "workers/compressor/container/compress.mjs"]
