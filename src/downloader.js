const EventEmitter = require('events');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const ProgressBar = require('progress');

class Downloader extends EventEmitter {
  async downloadAudio(videoUrl, outputFolder = './') {
    try {
      logger.verbose(`Starting download for URL: ${videoUrl}`);

      // Validate URL
      if (!ytdl.validateURL(videoUrl)) {
        this.emit('error', { status: 400, message: 'Invalid YouTube URL.' });
        return;
      }

      // Get video info
      const info = await ytdl.getInfo(videoUrl);
      const videoId = info.videoDetails.videoId;
      const videoCategory = info.videoDetails.category;
      logger.verbose(`Video info: id=${videoId}, category=${videoCategory}`);

      if (videoCategory !== 'Music') {
        this.emit('failure', {
          status: 406,
          message: 'Video is not in the Music category.',
          videoId,
        });
        return;
      }

      const allowedContainers = ['ogg', 'webm', 'mp4', 'm4a', 'wav', 'mp3'];
      const audioFormats = info.formats.filter(
        (fmt) =>
          fmt.mimeType.includes('audio') &&
          allowedContainers.includes(fmt.container),
      );
      if (audioFormats.length === 0) {
        this.emit('failure', {
          status: 404,
          message: 'No valid audio formats found.',
          videoId,
        });
        return;
      }

      const bestAudio = ytdl.chooseFormat(audioFormats, {
        filter: 'audioonly',
        quality: 'highestaudio',
      });
      const fileExt =
        bestAudio.container === 'mp4' ? 'm4a' : bestAudio.container;
      logger.verbose(
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

      logger.verbose(`Starting download to ${outputPath}...`);

      const stream = ytdl(videoUrl, { format: bestAudio });
      const writeStream = fs.createWriteStream(outputPath);

      stream.pipe(writeStream);

      stream.on('progress', (chunkLength) => {
        progressBar.tick(chunkLength);
      });

      stream.on('finish', () => {
        logger.verbose(`Download completed: ${outputPath}`);
        this.emit('success', { status: 200, videoId, outputPath });
      });

      stream.on('error', (error) => {
        logger.error(`Download failed: ${error.message}`);
        this.emit('error', { status: 500, message: error.message });
      });
    } catch (error) {
      logger.error(`Download failed: ${error.message}`);
      this.emit('error', { status: 500, message: error.message });
    }
  }
}

module.exports = Downloader;
