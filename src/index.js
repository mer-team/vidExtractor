// src/index.js
const { connectMessaging, sendMessage } = require('./messaging');
const { downloadAudio, downloadTest } = require('./downloader');
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
    logger.notice(`Waiting for messages in ${QUEUE_IN}...`);

    channel.consume(QUEUE_IN, async (msg) => {
      if (msg) {
        const videoUrl = msg.content.toString();
        logger.notice(`Message received: ${videoUrl}`);
        try {
          const outputPath = await downloadAudio(videoUrl, OUTPUT_FOLDER); // Wait for download to complete
          logger.notice(`Audio downloaded: ${outputPath}`);
          if (outputPath) {
            // Create a notification message for the manager
            const message = {
              service: serviceName,
              songId: videoUrl, // TODO: For a proper implementation, use a unique video ID
              status: true,
              payload: outputPath,
              timestamp: new Date().toISOString(),
            };
            await sendMessage(channel, QUEUE_OUT, message); // Notify manager
          }
          channel.ack(msg); // Acknowledge the message only after processing
        } catch (error) {
          logger.error(`Error processing message: ${error.message}`);
          channel.nack(msg); // Reject the message in case of an error
        }
      }
    });

    process.on('SIGINT', async () => {
      logger.notice('Shutting down...');
      await channel.close();
      process.exit();
    });
  } catch (error) {
    logger.error(error);
  }
}

if (process.argv.length === 2) {
  logger.notice('Starting service mode.');
  startService();
} else if (process.argv.length === 3) {
  logger.info('Starting CLI mode.');
  const videoUrl = process.argv[2];
  if (videoUrl) {
    downloadAudio(videoUrl, OUTPUT_FOLDER).then((output) => {
      if (output) {
        logger.info(`File saved at ${output}`);
      }
    });
  } else {
    logger.error('Please provide a YouTube URL as an argument.');
    process.exit(1);
  }
} else {
  logger.error('Invalid arguments.');
  process.exit(1);
}

logger.info('vidExtractor exiting.');
