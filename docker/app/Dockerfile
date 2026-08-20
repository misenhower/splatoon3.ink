FROM node:22

# App setup
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Archive compression
RUN apt-get update \
  && apt-get install -y --no-install-recommends zstd \
  && rm -rf /var/lib/apt/lists/*

# Install NPM dependencies
COPY package*.json ./
RUN npm ci

# Copy app files and build
COPY . .
RUN npm run build

CMD ["npm", "run", "start"]
