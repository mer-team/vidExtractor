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

module.exports = { connectMessaging, sendMessage };
