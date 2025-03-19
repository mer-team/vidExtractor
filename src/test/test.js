const fs = require('fs');
const amqp = require('amqplib/callback_api');
const assert = require('assert');

const config = {
  protocol: 'amqp',
  hostname: 'rabbitmq',
  port: 5672,
  username: 'guest',
  password: 'guest',
};

const GITHUB_WORKSPACE = process.env.GITHUB_WORKSPACE || '.';
const qTest = 'musicExtractionTest';
const qMain = 'musicExtraction';
const validLink = 'https://www.youtube.com/watch?v=JiF3pbvR5G0';
const validFile = 'JiF3pbvR5G0.wav';
const invalidLink = 'https://www.youtube.com/watch?v=ev-U6vl5Lek';
const invalidFile = 'ev-U6vl5Lek.wav';

describe('Testing RabbitMQ', () => {
  it('Should connect to RabbitMQ', (done) => {
    amqp.connect(config, (err, conn) => {
      assert.ifError(err);
      conn.close(done);
    });
  });

  it('Should send a valid music download request', (done) => {
    amqp.connect(config, (err, conn) => {
      assert.ifError(err);
      conn.createChannel((err, ch) => {
        assert.ifError(err);
        ch.assertQueue(qMain, { durable: false });
        ch.sendToQueue(qMain, Buffer.from(validLink));
        conn.close(done);
      });
    });
  });

  it('Should send an invalid music download request', (done) => {
    amqp.connect(config, (err, conn) => {
      assert.ifError(err);
      conn.createChannel((err, ch) => {
        assert.ifError(err);
        ch.assertQueue(qMain, { durable: false });
        ch.sendToQueue(qMain, Buffer.from(invalidLink));
        conn.close(done);
      });
    });
  });

  it('Should create a RabbitMQ channel', (done) => {
    amqp.connect(config, (err, conn) => {
      assert.ifError(err);
      conn.createConfirmChannel((err) => {
        assert.ifError(err);
        conn.close(done);
      });
    });
  });

  it('Should send and receive a message from RabbitMQ', (done) => {
    amqp.connect(config, (err, conn) => {
      assert.ifError(err);
      conn.createChannel((err, ch) => {
        assert.ifError(err);
        ch.assertQueue(qTest, { durable: false });
        ch.sendToQueue(qTest, Buffer.from(validLink));
        ch.consume(
          qTest,
          (msg) => {
            assert.strictEqual(msg.content.toString(), validLink);
            conn.close(done);
          },
          { noAck: true },
        );
      });
    });
  });
});

describe('Testing vidExtractor Script', () => {
  it('Should download the music file', (done) => {
    setTimeout(() => {
      fs.access(`${GITHUB_WORKSPACE}/${validFile}`, fs.F_OK, (err) => {
        assert.ifError(err);
        done();
      });
    }, 5000);
  });

  it('Should not download a file for an invalid music URL', (done) => {
    setTimeout(() => {
      fs.access(`${GITHUB_WORKSPACE}/${invalidFile}`, fs.F_OK, (err) => {
        assert.ok(err, 'File should not exist');
        done();
      });
    }, 5000);
  });
});
