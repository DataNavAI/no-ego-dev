FROM node:22-bookworm

WORKDIR /workspace

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

RUN node --check bin/ned.js \
  && node --check src/cli.js \
  && node --check src/providers/daytona.js \
  && chmod 0755 bin/ned.js

ENTRYPOINT ["node", "bin/ned.js"]
