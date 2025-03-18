# Use latest Node.js LTS version
FROM node:22

# Set working directory
WORKDIR /workspace

# Copy package files first to leverage caching
COPY package*.json ./

# Create folder for the audios
RUN mkdir -p /workspace/Audios

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY . .

# Expose ports (for metrics with Prometheus later)
# EXPOSE 9100

# Default command to start the service
CMD ["npm", "start"]
