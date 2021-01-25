const fs = require('fs'),
    ytdl = require('ytdl-core'),
    user = process.env.USER || 'merUser',
    pass = process.env.PASS || 'passwordMER',
    host = process.env.HOST || 'localhost',
    port = process.env.PORT || 5672;
var amqp = require('amqplib/callback_api');


/** 
 * Verifica se o URL fornecido está num formato válido aceite pelo Youtube 
 * @param {string} url URL fornecido
 * @returns {boolean}
*/
validURL = async (url) => {
    var result;
    try{
        result = await ytdl.getBasicInfo(url)
        if(result.videoDetails.media.category!="Music"){
            console.log("Not a music")
            return ;
        }
    }catch(err){
        console.log("Not a valid ID, err: "+err)
        return 
    }
    return ytdl.validateURL(url);
}

/**
 * Extrai o vídeo correspondente ao URL fornecido
 * @param {string} url URL fornecido
 * @returns {boolean} Resultado da extração, se foi ou não extraído
 */
extractVideo = async (url,ch) => {
    var vID = await ytdl.getURLVideoID(url);
    var path = './Audios/'+vID+'.wav'
    var audio = ytdl(url);
    audio.pipe(fs.createWriteStream(path));
    //https://github.com/MAMISHO/node-ytdl-core/commit/3e3b21215e6d02d729e9849f203e126e0b925efb
    audio.on('response', function(res) {
        /*var totalSize = res.headers['content-length']
        var dataRead = 0;
        res.on('data', function(data){
            dataRead += data.length;
            var percent = dataRead / totalSize;
            process.stdout.cursorTo(0);
            process.stdout.clearLine(1);
            process.stdout.write((percent * 100).toFixed(2) + '% ');
        })  */
        res.on('end', function() {
            process.stdout.write('Completed video extraction\n');
            var q = 'musicFeatures';
            ch.assertQueue(q, {durable: false});
            ch.sendToQueue(q, Buffer.from(vID), {persistent: false});
            console.log(" [x] Sent '%s'", vID);
          });
    })
}


/**
 * Inicializa todos os métodos necessários para a validação, extração e conversão de um vídeo para versão áudio
 */
startScript = async () => {
    console.log("Starting")
    amqp.connect(`amqp://${user}:${pass}@${host}/`, function(err, conn) {
    conn.createChannel(function(err, ch) {
        console.log("Connected")
        var q = 'musicExtraction';

        ch.assertQueue(q, {durable: false});
        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
        ch.consume(q, async function(msg) {
        console.log(" [x] Received %s", msg.content.toString());
        var url = msg.content.toString();
        var vURL = await validURL(url).then(u => u)
        if(vURL){
            await extractVideo(url,ch).then();
        }
        }, {noAck: true});
    });
    });
}

/**
 * Executa o método startScript
 */
startScript();