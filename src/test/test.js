const fs = require('fs');
var amqp = require('amqplib/callback_api');

const GITHUB_WORKSPACE = process.env.GITHUB_WORKSPACE;

const config={
  protocol: 'amqp',
  hostname: 'localhost',
  port: 5672,
  username: 'merUser',
  password: 'passwordMER',
}

const q = "musicExtractionTest";
const link = "https://www.youtube.com/watch?v=JiF3pbvR5G0";
const mfile = 'JiF3pbvR5G0.wav';

describe('Testing RabbitMQ', ()=>{
  it('Should connect to the RabbitMQ', (done)=>{
    amqp.connect(config, (err, conn)=>{
      if(err){
        console.log("Connection Error");
        return;
      }
      done();
      setTimeout(function() { conn.close();}, 500);
    });
  });

  it('Should send a music to download', (done)=>{
    amqp.connect(config, (err, conn)=>{
      if(err){
        console.log("Connection Error");
        return;
      }
      conn.createChannel((err, ch)=>{
        if(err){
          console.log("Error Creating Channel");
          return;
        }
        ch.assertQueue("musicExtraction", { durable: false }); 
        ch.sendToQueue("musicExtraction", Buffer.from(link),
          function(err) {
            if(err) {
              console.log("Error sending the message: ",err);
              return;         
            } else {
              console.log("Message sent");
              done();
          }
        });
      });
      done();
      setTimeout(function() { conn.close();}, 500);
    });
  });

  it('Should create the RabbitMQ channel', (done)=>{
    amqp.connect(config, (err, conn)=>{
      if(err){
        console.log("Connection Error");
        return;
      }
      conn.createConfirmChannel((err, ch)=>{
        if(err){
          console.log("Error Creating Channel");
          return;
        }
        done();
        setTimeout(function() { conn.close();}, 500);
      });
    });
  });

  it('Should send a message to the RabbitMQ', (done)=>{
    amqp.connect(config, (err, conn)=>{
      if(err){
        console.log("Connection Error");
        return;
      }
      conn.createChannel((err, ch)=>{
        if(err){
          console.log("Error Creating Channel");
          return;
        }
        ch.assertQueue(q, { durable: false }); 
        ch.sendToQueue(q, new Buffer(link), { persistent: false },
        function(err) {
          if(err) {
            console.log("Error sending the message: ",err);
            return;         
          } else {
            console.log("Message sent");
          }
        });
      });
      done();
      setTimeout(function() { conn.close();}, 500);  
    });
  });

  it("Should receive a message from the RabbitMQ", (done)=>{
    amqp.connect(config, (err, conn)=>{
      if(err){
        console.log("Connection Error");
        return;
      }
      conn.createChannel( (err, ch)=>{
        if(err){
          console.log("Error Creating Channel");
          return;
        }
        ch.assertQueue(q, { durable: false });
        ch.consume(q, function (msg) {
          if (msg.content.toString() == link){
            done();
            setTimeout(function() { conn.close();}, 500);
          } else {
            console.log("Unexpected message");
            return;
          }
        }, { noAck: true });
      });
    });
  });

  it("Testing vidExtractor Script", (done)=>{
    this.timeout(10000);
    setTimeout(function () {
      try {
        console.log(`dir: ${GITHUB_WORKSPACE}/Audios/${mfile}`);
        if (fs.existsSync(`${GITHUB_WORKSPACE}/Audios/${mfile}`)) {
          console.log("ficheiro existe!");
          done();
        }
      } catch(err) {
        console.error(err);
        console.log("Music File doesn't exist");
        return;
      }
    }, 10000);
  });
});