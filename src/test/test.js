const fs = require('fs');
var amqp = require('amqplib/callback_api');

const config={
  protocol: 'amqp',
  hostname: 'localhost',
  port: 5672,
  username: 'merUser',
  password: 'passwordMER',
}

const GITHUB_WORKSPACE = process.env.GITHUB_WORKSPACE;
      qTest = "musicExtractionTest",
      qMain = "musicExtraction",
      validLink = "https://www.youtube.com/watch?v=JiF3pbvR5G0",
      validFile = 'JiF3pbvR5G0.wav',
      invalidLink = "https://www.youtube.com/watch?v=ev-U6vl5Lek",
      invalidFile = "ev-U6vl5Lek.wav";

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
        ch.assertQueue(qMain, { durable: false }); 
        ch.sendToQueue(qMain, Buffer.from(validLink),
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

  it('Should send an invalid music to download', (done)=>{
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
        ch.assertQueue(qMain, { durable: false }); 
        ch.sendToQueue(qMain, Buffer.from(invalidLink),
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
        ch.assertQueue(qTest, { durable: false }); 
        ch.sendToQueue(qTest, Buffer.from(validLink), { persistent: false },
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
        ch.assertQueue(qTest, { durable: false });
        ch.consume(qTest, function (msg) {
          if (msg.content.toString() == validLink){
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
});

describe('Testing vidExtractor Script', function() {
  it('Should download the music file in the Docker Image', function(done) {
    setTimeout(function(){
      fs.access(`/Audios/${validFile}`, fs.F_OK, (err) => {
        if (err) {
          console.error(err)
          console.log("File not found!");
          return
        }
        console.log("File found!");
        done();
      })}, 5000);
  });

  it('Should not download the music file, valid URL, not a music', function(done) {
    setTimeout(function(){
      fs.access(`/Audios/${invalidFile}`, fs.F_OK, (err) => {
        if (err) {
          console.log("File not found!");
          done();
        }
        return
      })}, 5000);
  });
});