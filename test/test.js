const fs = require('fs');
const amqp = require('amqplib');
const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');

let serviceProcess;
let serviceLogFile = path.join(__dirname, 'service.log'); // Temporary log file

// Configuration for RabbitMQ and test environment
const config = {
  protocol: 'amqp',
  hostname: process.env.RABBITMQ_HOST || 'rabbitmq',
  port: process.env.RABBITMQ_PORT || 5672,
  username: process.env.RABBITMQ_USER || 'guest',
  password: process.env.RABBITMQ_PASS || 'guest',
};

const OUTPUT_FOLDER = process.env.OUTPUT_FOLDER || '/audios'; // Matches the service's output folder
const VID_EXTRACTOR_QUEUE = process.env.VID_EXTRACTOR_QUEUE || 'yt-download';
const MER_MANAGER_QUEUE = process.env.MER_MANAGER_QUEUE || 'mer-manager';

// Allowed file extensions for valid downloads
const allowedContainers = ['ogg', 'webm', 'mp4', 'm4a', 'wav', 'mp3'];

// Test data
const validLink = 'https://www.youtube.com/watch?v=gGdGFtwCNBE';
const validVideoId = 'gGdGFtwCNBE';
const invalidLink = 'https://www.youtube.com/watch?v=invalid123';
const nonMusicLink = 'https://www.youtube.com/watch?v=OOgU2vy6k14';
const nonMusicVideoId = 'OOgU2vy6k14';

describe('vid-extractor microservice tests', () => {
  let connection;
  let channel;

  // Start the service before tests
  before(async () => {
    serviceProcess = spawn('node', ['./src/index.js'], {
      stdio: [
        'ignore',
        fs.openSync(serviceLogFile, 'w'),
        fs.openSync(serviceLogFile, 'w'),
      ],
    });

    // Wait for the service to initialize
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Setup RabbitMQ connection and channel
    connection = await amqp.connect(config);
    channel = await connection.createChannel();
    await channel.assertQueue(VID_EXTRACTOR_QUEUE);
    await channel.assertQueue(MER_MANAGER_QUEUE);
    await channel.purgeQueue(VID_EXTRACTOR_QUEUE);
    await channel.purgeQueue(MER_MANAGER_QUEUE);
  });

  // Stop the service and cleanup after tests
  after(async () => {
    try {
      // Ensure the service is terminated
      if (!serviceProcess.killed) {
        serviceProcess.kill('SIGINT');
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for shutdown
      }

      // Check for shutdown log message
      const logs = fs.readFileSync(serviceLogFile, 'utf-8');
      assert.ok(logs.includes('Shutting down...'));
    } catch (err) {
      console.error('Error during cleanup:', err);
    } finally {
      // Cleanup temporary log file
      if (fs.existsSync(serviceLogFile)) {
        fs.unlinkSync(serviceLogFile);
      }
    }

    // Close RabbitMQ connection and channel
    if (channel) await channel.close();
    if (connection) await connection.close();
  });

  // Clear queues before each test
  beforeEach(async () => {
    await channel.purgeQueue(VID_EXTRACTOR_QUEUE);
    await channel.purgeQueue(MER_MANAGER_QUEUE);
  });

  // Test service startup
  it('Should start the service and log the correct message', async () => {
    const logs = fs.readFileSync(serviceLogFile, 'utf-8');
    assert.ok(
      logs.includes(
        `Service started. Waiting for messages in ${VID_EXTRACTOR_QUEUE}...`,
      ),
      'Service did not start correctly',
    );
    assert.ok(
      !logs.includes('Shutting down...'),
      'Unexpected shutdown message found in logs',
    );
    assert.ok(
      !logs.includes('Error'),
      'Unexpected error message found in logs',
    );
  });

  function waitForMessage(channel, queue, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Message not received within timeout'));
      }, timeout);

      channel.consume(
        queue,
        (msg) => {
          clearTimeout(timer);
          resolve(JSON.parse(msg.content.toString()));
          channel.ack(msg);
          channel.cancel(msg.fields.consumerTag); // Cancel the consumer after receiving the message
        },
        { noAck: false },
      );
    });
  }

  it('Should process a valid YouTube link and create a file', async function () {
    if (process.env.GITHUB_ACTIONS) {
      this.skip(); // Skip the test in GitHub Actions
    }

    this.timeout(30000); // Extend timeout for download

    // Send a valid YouTube link to the VID_EXTRACTOR_QUEUE
    await channel.sendToQueue(VID_EXTRACTOR_QUEUE, Buffer.from(validLink));

    // Wait for a message in MER_MANAGER_QUEUE with a custom timeout
    const message = await waitForMessage(channel, MER_MANAGER_QUEUE, 25000);

    // Assert the message contains the expected status and payload
    assert.strictEqual(message.status, 200);
    assert.strictEqual(message.songId, validVideoId);

    // Check if the file was created in the OUTPUT_FOLDER with a valid extension
    const downloadedFile = allowedContainers.some((ext) =>
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.existsSync(path.join(OUTPUT_FOLDER, `${validVideoId}.${ext}`)),
    );

    assert.ok(
      message.payload.includes(path.join(OUTPUT_FOLDER, `${validVideoId}.`)),
    );

    assert.ok(downloadedFile, 'Downloaded file does not exist');
  });

  it('Should handle an invalid YouTube link gracefully', async function () {
    this.timeout(7000); // Extend timeout for processing

    // Send an invalid YouTube link to the VID_EXTRACTOR_QUEUE
    await channel.sendToQueue(VID_EXTRACTOR_QUEUE, Buffer.from(invalidLink));

    // Wait for a message in MER_MANAGER_QUEUE
    const message = await waitForMessage(channel, MER_MANAGER_QUEUE);

    // Assert the message contains the expected failure status
    assert.strictEqual(message.status, 400);
    assert.ok(message.message.includes('Invalid YouTube URL'));
  });

  it('Should handle a non-music video gracefully', async function () {
    if (process.env.GITHUB_ACTIONS) {
      this.skip(); // Skip the test in GitHub Actions
    }

    this.timeout(7000); // Extend timeout for processing

    // Send a non-music category video link to the VID_EXTRACTOR_QUEUE
    await channel.sendToQueue(VID_EXTRACTOR_QUEUE, Buffer.from(nonMusicLink));

    // Wait for a message in MER_MANAGER_QUEUE
    const message = await waitForMessage(channel, MER_MANAGER_QUEUE);

    // Assert the message contains the expected failure status and error message
    assert.strictEqual(message.status, 406);
    assert.ok(message.message.includes('Video is not in the Music category'));

    // Ensure no file is created for the non-music video
    const nonMusicFile = allowedContainers.some((ext) =>
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.existsSync(path.join(OUTPUT_FOLDER, `${nonMusicVideoId}.${ext}`)),
    );
    assert.ok(!nonMusicFile, 'File should not exist for non-music video');
  });

  // Test service shutdown
  it('Should shut down the service and log the correct message', async () => {
    serviceProcess.kill('SIGINT');
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for shutdown

    const logs = fs.readFileSync(serviceLogFile, 'utf-8');
    assert.ok(
      logs.includes('Shutting down...'),
      'Service did not shut down correctly',
    );
  });
});
