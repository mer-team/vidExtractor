FROM node:22-alpine

# Set environment variables for production
ENV NODE_ENV=production

# Install dependencies
RUN apk --no-cache add curl

# Set working directory
WORKDIR /vid-extractor

# Copy package.json and package-lock.json first to leverage caching
COPY ./src/package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy application source code
COPY ./src /vid-extractor

# Create folder for the audios and change ownership to the node user
RUN mkdir -p /audios && chown -R node:node /audios

# Set the default user to node for better security
USER node

# Expose necessary ports (optional, based on your app's requirements)
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]