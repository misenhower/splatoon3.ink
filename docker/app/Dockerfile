FROM node:20

# App setup
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install NPM dependencies
COPY package*.json ./
RUN npm ci

# Copy app files and build
COPY . .
RUN npm run build

CMD ["npm", "run", "start"]
