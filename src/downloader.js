const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const ProgressBar = require('progress');

async function downloadAudio(videoUrl, outputFolder = './') {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info(`Starting download for URL: ${videoUrl}`);

      // Validate URL
      if (!ytdl.validateURL(videoUrl)) {
        logger.error('Invalid YouTube URL.');
        return;
      }

      // Get video ID and create filename
      const info = await ytdl.getInfo(videoUrl);
      const videoId = info.videoDetails.videoId;
      const videoCategory = info.videoDetails.category;
      logger.info(`Video info: id=${videoId}, category=${videoCategory}`);

      if (videoCategory !== 'Music') {
        logger.error('Video is not in the Music category.');
        return null;
      }

      const allowedContainers = ['ogg', 'webm', 'mp4', 'm4a', 'wav', 'mp3'];
      const audioFormats = info.formats.filter(
        (fmt) =>
          fmt.mimeType.includes('audio') &&
          allowedContainers.includes(fmt.container),
      );
      if (audioFormats.length === 0) {
        logger.error('No valid audio formats found.');
        return null;
      }

      const bestAudio = ytdl.chooseFormat(audioFormats, {
        filter: 'audioonly', // Download only audio
        quality: 'highestaudio', // Get the highest quality audio
      });
      const fileExt =
        bestAudio.container === 'mp4' ? 'm4a' : bestAudio.container;
      logger.info(
        `Selected format: ${bestAudio.container}, bitrate: ${bestAudio.audioBitrate} kbps`,
      );

      const totalBytes = parseInt(bestAudio.contentLength, 10);
      const progressBar = new ProgressBar(
        'Downloading [:bar] :rate/kbps :percent :etas',
        {
          total: totalBytes,
          width: 40,
        },
      );

      const filename = `${videoId}.${fileExt}`;
      const outputPath = path.join(outputFolder, filename);

      // Create output folder if it doesn't exist
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      logger.info(`Starting download to ${outputPath}...`);

      // Create download stream with audio-only filter
      const stream = ytdl(videoUrl, { format: bestAudio });
      const writeStream = fs.createWriteStream(outputPath);

      stream.pipe(writeStream);

      stream.on('progress', (chunkLength) => {
        progressBar.tick(chunkLength);
      });

      stream.on('finish', () => {
        logger.info(`Download completed: ${outputPath}`);
        resolve(outputPath); // Resolve the promise with the output path
      });

      stream.on('error', (error) => {
        logger.error(`Download failed: ${error.message}`);
        reject(error); // Reject the promise on error
      });
    } catch (error) {
      logger.error(`Download failed: ${error.message}`);
      reject(error);
    }
  });
}

module.exports = { downloadAudio };
