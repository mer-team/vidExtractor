# Use latest Node.js LTS version
FROM node:22

# Set working directory
WORKDIR /workspaces/vid-extractor

# Install Hadolint
RUN curl -Lo /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/latest/download/hadolint-Linux-x86_64 && \
    chmod +x /usr/local/bin/hadolint

# Copy package files first to leverage caching
COPY package*.json ./

# Create folder for the audios and change ownership to the node user
RUN mkdir -p /audios && chown -R node:node /audios

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY . .

# Switch to the non-root user
# USER node

# Expose ports (for metrics with Prometheus later)
# EXPOSE 9100

# Default command to start the service
CMD ["npm", "start"]
