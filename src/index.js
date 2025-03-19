// src/index.js
const { connectMessaging, sendMessage } = require('./messaging');
const Downloader = require('./downloader');
const logger = require('./logger');
const amqp = require('amqplib');

// Get configuration from environment variables with defaults
const {
  USER = 'guest',
  PASS = 'guest',
  HOST = 'rabbitmq',
  PORT = '5672',
  QUEUE_IN = 'yt-download',
  QUEUE_OUT = 'mer-manager',
} = process.env;

const serviceName = 'yt_downloader';
const OUTPUT_FOLDER = '/audios'; // Define the output folder as a constant
let channel;

async function startService() {
  try {
    const { connection, channel: ch } = await connectMessaging({
      user: USER,
      pass: PASS,
      host: HOST,
      port: PORT,
    });
    channel = ch;
    await channel.assertQueue(QUEUE_IN);
    logger.info(`Waiting for messages in ${QUEUE_IN}...`);

    channel.consume(QUEUE_IN, async (msg) => {
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
          await sendMessage(channel, QUEUE_OUT, message);
          channel.ack(msg);
        });

        downloader.on('failure', async ({ status, message, videoId }) => {
          logger.warn(`Download failed: ${message}`);
          const notifyMessage = {
            service: serviceName,
            songId: videoId,
            status,
            message,
            timestamp: new Date().toISOString(),
          };
          await sendMessage(channel, QUEUE_OUT, notifyMessage);
          channel.ack(msg);
        });

        downloader.on('error', async ({ status, message }) => {
          logger.error(`Error: ${message}`);
          const errorMessage = {
            service: serviceName,
            status,
            message,
            timestamp: new Date().toISOString(),
          };
          await sendMessage(channel, QUEUE_OUT, errorMessage);
          channel.nack(msg);
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
    logger.error(error);
  }
}

startService();

logger.info('vidExtractor exiting.');
