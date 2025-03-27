FROM node:22-alpine

# Set environment variables for production
ENV NODE_ENV=production

# Install dependencies
RUN apk --no-cache add curl=8.2.1-r1

# Set working directory and ensure it is owned by the node user
WORKDIR /vid-extractor

# Copy package.json and package-lock.json first to leverage caching
COPY ./package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Create folder for the audios and ensure it is owned by the node user
RUN mkdir -p /audios && chown -R node:node /vid-extractor /audios

# Set the default user to node for better security
USER node

# Copy application source code
COPY ./src /vid-extractor

# Expose necessary ports (optional, based on your app's requirements)
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]