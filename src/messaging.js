// src/messaging.js
const amqp = require('amqplib');
const logger = require('./logger');

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

async function sendMessage(channel, queue, message) {
  const buffer = Buffer.from(JSON.stringify(message));
  await channel.assertQueue(queue);
  channel.sendToQueue(queue, buffer);
  logger.info(`Message sent to queue ${queue}: ${JSON.stringify(message)}`);
}

module.exports = { connectMessaging, sendMessage };
