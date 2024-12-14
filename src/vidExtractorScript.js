const ytdl = require('ytdl-core');
const fs = require('fs');
const amqp = require('amqplib');
const ProgressBar = require('progress');
const Table = require('cli-table3');
const { table } = require('console');
const path = require('path');

const greenCheckbox = '\x1b[32m\u2713\x1b[0m'; // Green checkbox with ANSI escape codes
const yellowInfo = `\x1b[33mℹ\x1b[0m`; // Yellow info character with ANSI escape codes
const redCrossmark = '\x1b[31m\u274C\x1b[0m'; // Red crossmark with ANSI escape codes

const user = process.env.USER || 'guest';
const pass = process.env.PASS || 'guest';
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 5672;
const queue_in = process.env.QUEUE_IN || 'yt-download';
const queue_out = process.env.QUEUE_OUT || 'mer-manager';
const serviceName = "yt_downloader"
let connection, channel;

function printProgress(progress) {
    process.stdout.clearLine(); // Clear the current line
    process.stdout.cursorTo(0); // Move the cursor to the beginning of the line
    process.stdout.write(`Downloaded: ${progress.toFixed(2)}%`);
}

function dumpYTdata(info) {
    console.log(' [%s] Dumping YTDL Info data to JSON file.', yellowInfo);
    const jsonString = JSON.stringify(info, null, 2); // Indentation of 2 spaces

    const filePath = 'dumpYTdata-object.json';

    fs.writeFile(filePath, jsonString, 'utf8', (err) => {
        if (err) {
            console.error('[%s] Error writing YTDL data to JSON file: %s', redCrossmark, err);
        } else {
            console.log(' [%s] Information object has been written to %s.', greenCheckbox, filePath);
        }
    });
}

async function downloadAudio(videoUrl, outputFolder = "./") {

    try {

        const isValid = ytdl.validateURL(videoUrl);

        if (isValid == false) {
            console.log(" [%s] The provided URL does not contain a valid YouTube ID.", redCrossmark);
            return;
        }

        // Get video info including available formats
        const info = await ytdl.getInfo(videoUrl);
        //dumpYTdata(info);

        const videoId = info.videoDetails.videoId;
        const videoCategory = info.videoDetails.category;
        console.log(" [%s] Video information scrapped.", greenCheckbox);

        // Print video details
        console.log('  [%s] Video ID: %s', yellowInfo, videoId);
        console.log('  [%s] Video Title: %s', yellowInfo, info.videoDetails.title);
        console.log('  [%s] Video Category: %s', yellowInfo, videoCategory);
        console.log('  [%s] Video Length: %s secs', yellowInfo, info.videoDetails.lengthSeconds);
        console.log('  [%s] Video View Count: %s', yellowInfo, info.videoDetails.viewCount);

        // file is not a music video, stop processing
        if (videoCategory !== 'Music') {
            console.log(" [%s] The YouTube video is not a Music video (Category != Music).", redCrossmark);
            return;
        }

        if (info.videoDetails.keywords !== null) {
            console.log('  [%s] Video Keywords: %s.', yellowInfo, info.videoDetails.keywords.join(', '));
        }

        // Print available audio formats and bitrates
        console.log('  [%s] Available Audio Streams:', yellowInfo);

        // Create a Audio Streams table
        const audioStreamsTable = new Table({
            head: ['Container', 'Bitrate', 'Codec', 'SampleRate', 'Channels', 'Quality'],
            //colWidths: [20, 10, 30],
            style: {
                head: ['cyan'],
                border: ['grey'],
            },
        });

        info.formats.filter(format =>
            format.mimeType.includes('audio')
        ).forEach(format => {
            audioStreamsTable.push(
                [format.container, `${format.audioBitrate} kbps`, format.audioCodec, format.audioSampleRate, format.audioChannels, format.audioQuality]
            );
            //  console.log(`   - Container: ${format.container} \tBitrate: ${format.audioBitrate} kbps \tCodec: ${format.audioCodec} \tSample Rate: ${format.audioSampleRate} \tChannels: ${format.audioChannels} \t Quality: ${format.audioQuality}`);
        });

        console.log(audioStreamsTable.toString());

        // Print available video formats and bitrates
        console.log('  [%s] Available Video Streams:', yellowInfo);

        // Create a Audio Streams table
        const videoStreamsTable = new Table({
            head: ['Container', 'Bitrate', 'Codec', 'Quality', 'FPS', 'Has Audio?', 'AudioBitrate'],
            //colWidths: [20, 10, 30],
            style: {
                head: ['cyan'],
                border: ['grey'],
            },
        });

        info.formats.filter(format =>
            format.mimeType.includes('video')
        ).forEach(format => {
            videoStreamsTable.push(
                [format.container, `${format.bitrate} kbps`, format.codecs, format.qualityLabel, format.fps, format.hasAudio, format.audioBitrate]
            );
            // console.log(`   - Format: ${format.container} \tBitrate: ${format.bitrate} kbps \tQuality: ${format.qualityLabel} \tHasAudio: ${format.hasAudio} \tCodecs: ${format.codecs}`);
        });

        console.log(videoStreamsTable.toString());

        // Filter for audio-only formats with allowed containers
        const allowedContainers = ['ogg', 'webm', 'mp4', 'm4a', 'wav', 'mp3'];
        const audioFormats = info.formats.filter(format =>
            format.mimeType.includes('audio') &&
            allowedContainers.includes(format.container)
        );

        if (audioFormats.length > 0) {
            // Choose the best audio format
            const bestAudioFormat = ytdl.chooseFormat(audioFormats, { quality: 'highestaudio' });

            // Determine file extension based on format container
            const fileExtension = bestAudioFormat.container === 'mp4' ? 'm4a' : bestAudioFormat.container;

            // Log selected format and bitrate
            console.log(` [${greenCheckbox}] Selected audio format to download: ${bestAudioFormat.container}, Bitrate: ${bestAudioFormat.audioBitrate} kbps.`);

            // Initialize progress bar
            const totalBytes = parseInt(bestAudioFormat.contentLength, 10);
            const progressBar = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
                total: totalBytes,
                width: 40
            });

            // Download the audio
            const audioStream = ytdl(videoUrl, { format: bestAudioFormat });

            // Track download progress
            let downloadedBytes = 0;
            audioStream.on('progress', (chunkLength, downloaded, total) => {
                downloadedBytes += chunkLength;
                const progress = (downloadedBytes / total) * 100;
                //printProgress(progress);
                progressBar.tick(chunkLength);
            });

            // Pipe the audio stream to a file
            const filename = `${videoId}.${fileExtension}`;
            const outputPath = path.join(outputFolder, filename);
            audioStream.pipe(fs.createWriteStream(outputPath));

            audioStream.on('end', () => {
                console.log(' [%s] Audio downloaded and saved: %s.', greenCheckbox, outputPath);
                // notify manager that a video has been downloaded
                notifyManager(channel, queue_out, videoId, true, outputPath);
            });
        } else {
            console.error(' [%s] No matching audio formats found for the video.', redCrossmark);
        }
    } catch (error) {
        console.error(' [%s] Error:', redCrossmark, error);
        notifyManager(channel, queue_out, videoId, false, null);
    }
}

/*
 * Notify the MERmaid manager service over queue_out RabbitMQ queue
 */
async function notifyManager(channel, queue, songId, status, payload) {
  const message = {
    service: serviceName,
    songId: songId,
    status: status,
    payload: payload,
    timestamp: new Date().toISOString(),
  };

  const messageBuffer = Buffer.from(JSON.stringify(message));

  await channel.assertQueue(queue);
  channel.sendToQueue(queue, messageBuffer);

  console.log(" [%s]: Result (songId: \"%s\" -> status: %s) sent to queue \"%s\"", greenCheckbox, songId, status, queue);
}

/**
 * Starts the YT Downloader MERmaid service
 */
async function startService() {
    try {

        connection = await amqp.connect(`amqp://${user}:${pass}@${host}:${port}/`);
        console.log(" [%s] Connected to RabbitMQ server at %s:%s.", greenCheckbox, host, port);
        channel = await connection.createChannel();

        const queueName = queue_in;

        await channel.assertQueue(queueName); //TODO: check difference between durable or not

        console.log(" [%s] Waiting for messages in %s. To exit press CTRL+C.", yellowInfo, queueName);

        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                var url = msg.content.toString();
                console.log(" [%s] Received a new message: %s", greenCheckbox, url);
                await downloadAudio(url, "./Audios");
                channel.ack(msg); // Acknowledge the message, TODO: if success only?
                
                console.log(" [%s] Waiting for messages in %s. To exit press CTRL+C.", yellowInfo, queueName);
            }
        });

        process.on('SIGINT', () => {
            console.log(' [%s] Received CTRL+C. Closing connection...', redCrossmark);
            channel.close();
            connection.close();
            process.exit();
        });
    } catch (error) {
        console.log(error)
    }
}


if (process.argv.length == 2) {
    // service mode (via rabbitmq queues)
    console.log(' [%s] Starting vidExtractor in service mode.', yellowInfo);
    startService();
}
else if (process.argv.length == 3) {
    console.log(' [%s] Starting vidExtractor in cli mode.', yellowInfo);
    const videoUrl = process.argv[2]; // Get video URL from command-line argument

    if (videoUrl) {
        downloadAudio(videoUrl);
    }
    else {
        console.error(' [%s] Please provide a valid YouTube video URL as a command-line argument.', redCrossmark);
        process.exit(1);
    }
}
else {
    console.error(' [%s] Please provide no arguments to start in SERVICE mode, or a YouTube video URL as a command-line argument.', redCrossmark);
    process.exit(1);
}

console.log(' [%s] KTHXBYE.', yellowInfo);