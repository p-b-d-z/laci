FROM node:22.11.0

# Create app directory
WORKDIR /app

# Disable telemetry (data collection) https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Use build argument to conditionally copy files for local container builds using docker compose. When local, we don't
# want to load the container, these are mounted in the docker-compose file.
ARG local=false
ARG REDIS_HOST=localhost
ARG REDIS_PORT=6379
ENV REDIS_HOST=$REDIS_HOST
ENV REDIS_PORT=$REDIS_PORT

COPY package*.json ./

# Use build argument to conditionally run npm install
RUN if [ "$local" = "true" ]; then npm install; fi

# Copy the rest of the application files
COPY . .

# Use build argument to conditionally run npm ci and npm run build for local container builds using docker compose
# this speeds up dev builds when local.
RUN if [ "$local" = "false" ]; then npm ci && npm run build; fi

EXPOSE 3000

CMD [ "npm", "run",  "start" ]
