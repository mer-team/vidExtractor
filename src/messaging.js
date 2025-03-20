// src/messaging.js
const amqp = require('amqplib');
const logger = require('./logger');

// Connect to RabbitMQ messaging service
async function connectMessaging(config) {
  const { user, pass, host, port } = config;
  const url = `amqp://${user}:${pass}@${host}:${port}/`;
  try {
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();
    logger.info(`Connected to RabbitMQ at ${host}:${port}`);
    return { connection, channel };
  } catch (error) {
    logger.error(`RabbitMQ connection failed: ${error}`);
    throw error;
  }
}

// Send a message to a specified queue
async function sendMessage(channel, queue, message) {
  try {
    const buffer = Buffer.from(JSON.stringify(message));
    await channel.assertQueue(queue);
    channel.sendToQueue(queue, buffer);
    logger.info(`Message sent to queue ${queue}: ${JSON.stringify(message)}`);
  } catch (error) {
    logger.error(`Failed to send message to queue ${queue}: ${error.message}`);
    throw error;
  }
}

async function connectWithRetry(config, retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const { connection, channel: ch } = await connectMessaging(config);
      return { connection, channel: ch };
    } catch (error) {
      logger.warn(
        `RabbitMQ connection failed. Retrying in ${delay / 1000} seconds...`,
      );
      if (i < retries - 1)
        await new Promise((resolve) => setTimeout(resolve, delay));
      else throw error;
    }
  }
}

module.exports = { connectMessaging, sendMessage, connectWithRetry };
