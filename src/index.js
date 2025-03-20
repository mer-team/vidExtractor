// src/index.js
const { connectWithRetry, sendMessage } = require('./messaging');
const Downloader = require('./downloader');
const logger = require('./logger');

// Get configuration from environment variables with defaults
const {
  RABBITMQ_USER = 'guest',
  RABBITMQ_PASS = 'guest',
  RABBITMQ_HOST = 'rabbitmq',
  RABBITMQ_PORT = '5672',
  VID_EXTRACTOR_QUEUE = 'yt-download',
  MER_MANAGER_QUEUE = 'mer-manager',
} = process.env;

const serviceName = 'yt_downloader';
const OUTPUT_FOLDER = '/audios'; // Define the output folder as a constant
let channel;

async function startService() {
  try {
    const { channel: ch } = await connectWithRetry({
      user: RABBITMQ_USER,
      pass: RABBITMQ_PASS,
      host: RABBITMQ_HOST,
      port: RABBITMQ_PORT,
    });
    channel = ch;
    await channel.assertQueue(VID_EXTRACTOR_QUEUE);
    await channel.assertQueue(MER_MANAGER_QUEUE);
    logger.info(
      `Service started. Waiting for messages in ${VID_EXTRACTOR_QUEUE}...`,
    );

    channel.consume(VID_EXTRACTOR_QUEUE, async (msg) => {
      if (msg) {
        const videoUrl = msg.content.toString();
        logger.info(`Message received: ${videoUrl}`);
        const downloader = new Downloader();

        downloader.on('success', async ({ status, videoId, outputPath }) => {
          logger.info(`Audio downloaded: ${outputPath}`);
          const message = {
            service: serviceName,
            songId: videoId,
            status,
            payload: outputPath,
            timestamp: new Date().toISOString(),
          };
          await sendMessage(channel, MER_MANAGER_QUEUE, message);
          channel.ack(msg);
        });

        downloader.on('failure', async ({ status, message, videoId }) => {
          logger.warn(`Download failed: ${message}`);
          const notifyMessage = {
            service: serviceName,
            songId: videoId || null, // Ensure videoId is included even if null
            status: status || 400, // Default to 400 if no status is provided
            message,
            timestamp: new Date().toISOString(),
          };
          await sendMessage(channel, MER_MANAGER_QUEUE, notifyMessage); // Ensure message is sent
          channel.ack(msg);
        });

        downloader.on('error', async ({ status, message }) => {
          logger.error(`Error: ${message}`);
          const errorMessage = {
            service: serviceName,
            status: status || 500, // Default to 500 if no status is provided
            message,
            timestamp: new Date().toISOString(),
          };
          await sendMessage(channel, MER_MANAGER_QUEUE, errorMessage);
          channel.ack(msg);
        });

        downloader.downloadAudio(videoUrl, OUTPUT_FOLDER);
      }
    });

    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      try {
        await channel.close();
        logger.info('RabbitMQ channel closed.');
      } catch (error) {
        logger.error(`Error closing RabbitMQ channel: ${error.message}`);
      }
      process.exit();
    });
  } catch (error) {
    logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
    process.exit(1); // Exit if RabbitMQ is not reachable after retries
  }
}

startService();

logger.info('vidExtractor exiting.');
