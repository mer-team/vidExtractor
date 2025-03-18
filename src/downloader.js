// src/downloader.js
const ytdl = require('ytdl-core');
const ProgressBar = require('progress');
const { saveFile } = require('./fileHandler');
const logger = require('./logger');

async function downloadAudio(videoUrl, outputFolder = './') {
  try {
    if (!ytdl.validateURL(videoUrl)) {
      logger.error('Invalid YouTube URL.');
      return null;
    }
    const info = await ytdl.getInfo(videoUrl);
    const videoId = info.videoDetails.videoId;
    const videoCategory = info.videoDetails.category;
    logger.info(
      `Video info retrieved: ID=${videoId}, Category=${videoCategory}`,
    );

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
      quality: 'highestaudio',
    });
    const fileExt = bestAudio.container === 'mp4' ? 'm4a' : bestAudio.container;
    logger.info(
      `Selected format: ${bestAudio.container}, Bitrate: ${bestAudio.audioBitrate} kbps`,
    );

    const totalBytes = parseInt(bestAudio.contentLength, 10);
    const progressBar = new ProgressBar(
      'Downloading [:bar] :rate/bps :percent :etas',
      {
        total: totalBytes,
        width: 40,
      },
    );
    const audioStream = ytdl(videoUrl, { format: bestAudio });
    audioStream.on('progress', (chunkLength) => {
      progressBar.tick(chunkLength);
    });

    const filename = `${videoId}.${fileExt}`;
    const outputPath = `${outputFolder}/${filename}`;
    await saveFile(outputPath, audioStream);

    return outputPath;
  } catch (error) {
    logger.error(`Download failed: ${error}`);
    return null;
  }
}

module.exports = { downloadAudio };
