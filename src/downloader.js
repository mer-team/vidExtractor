/* eslint-disable security/detect-non-literal-fs-filename */
const EventEmitter = require('events');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const ProgressBar = require('progress');
const { logAvailableStreams } = require('./streamLogger');

/**
 * Downloader class for downloading audio from YouTube videos.
 * Extends EventEmitter to emit events about the download process.
 *
 * Events:
 * - 'success': Emitted when download completes successfully
 * - 'failure': Emitted when download fails due to validation errors
 * - 'error': Emitted when download fails due to runtime errors
 */
class Downloader extends EventEmitter {
  constructor() {
    super();
    this.hasEmittedEvent = false; // Track if an event has been emitted
    this.FALLBACK = 1; // process.env.FALLBACK === '1'; // Check if FALLBACK is enabled
  }

  /**
   * Download audio from a YouTube video URL
   * @param {string} videoUrl - The YouTube video URL
   * @param {string} outputFolder - The folder to save the downloaded audio
   */
  async downloadAudio(videoUrl, outputFolder = './') {
    this.hasEmittedEvent = false; // Reset the event flag

    try {
      // Validate and get video info
      const videoInfo = await this.validateAndGetInfo(videoUrl);
      if (!videoInfo) return; // Validation failed, event already emitted

      const { videoId } = videoInfo;

      // Select the best audio format
      const formatInfo = this.selectAudioFormat(videoInfo, videoId);
      if (!formatInfo) return; // Format selection failed, event already emitted

      const { bestAudio, fileExt } = formatInfo;

      // Set up file path and create folders
      const outputPath = this.setupOutputPath(videoId, fileExt, outputFolder);
      if (!outputPath) return; // Setup failed, event already emitted

      if (this.FALLBACK) {
        // Use fallback download method
        logger.verbose('FALLBACK mode enabled. Using simpler download method.');
        await this.performFallbackDownload(videoUrl, outputPath, videoId);
      } else {
        // Use the standard download method
        await this.performDownload(videoUrl, bestAudio, outputPath, videoId);
      }
    } catch (error) {
      logger.error(`Unexpected error: ${error.message}`);
      this.safeEmit('error', {
        status: 500,
        message: `Unexpected error: ${error.message}`,
      });
    }
  }

  /**
   * Validate the YouTube URL and get video information
   * @param {string} videoUrl - The YouTube video URL
   * @returns {Object|null} Video information or null if validation failed
   */
  async validateAndGetInfo(videoUrl) {
    logger.verbose(`Starting download for URL: ${videoUrl}`);

    // Validate URL
    if (!ytdl.validateURL(videoUrl)) {
      this.safeEmit('failure', {
        status: 400,
        message: 'Invalid YouTube URL.',
      });
      return null;
    }

    try {
      // Get video info
      const info = await ytdl.getInfo(videoUrl);
      const videoId = info.videoDetails.videoId;
      const videoCategory = info.videoDetails.category;

      logger.verbose(`Video info: id=${videoId}, category=${videoCategory}`);

      // Log available streams if logging level is verbose
      logAvailableStreams(info);

      // Ensure the video is in the Music category
      if (videoCategory !== 'Music') {
        this.safeEmit('failure', {
          status: 406,
          message: 'Video is not in the Music category.',
          videoId,
        });
        return null;
      }

      return { videoId, videoDetails: info.videoDetails, info };
    } catch (error) {
      logger.error(`Failed to get video info: ${error.message}`);
      this.safeEmit('error', {
        status: 500,
        message: `Failed to get video info: ${error.message}`,
      });
      return null;
    }
  }

  /**
   * Select the best audio format for the video
   * @param {Object} videoInfo - Video information
   * @param {string} videoId - Video ID
   * @returns {Object|null} Selected format info or null if selection failed
   */
  selectAudioFormat(videoInfo, videoId) {
    const { info } = videoInfo;

    // Filter and select the best audio format
    const allowedContainers = ['ogg', 'webm', 'mp4', 'm4a', 'wav', 'mp3'];
    const audioFormats = info.formats.filter(
      (fmt) =>
        fmt.mimeType.includes('audio') &&
        allowedContainers.includes(fmt.container),
    );

    if (audioFormats.length === 0) {
      this.safeEmit('failure', {
        status: 404,
        message: 'No valid audio formats found.',
        videoId,
      });
      return null;
    }

    try {
      const bestAudio = ytdl.chooseFormat(audioFormats, {
        filter: 'audioonly',
        quality: 'highestaudio',
      });

      const fileExt =
        bestAudio.container === 'mp4' ? 'm4a' : bestAudio.container;

      logger.verbose(
        `Selected format: ${bestAudio.container}, bitrate: ${bestAudio.audioBitrate} kbps`,
      );

      return { bestAudio, fileExt };
    } catch (error) {
      logger.error(`Failed to select audio format: ${error.message}`);
      this.safeEmit('error', {
        status: 500,
        message: `Failed to select audio format: ${error.message}`,
      });
      return null;
    }
  }

  /**
   * Set up the output path and ensure directories exist
   * @param {string} videoId - Video ID
   * @param {string} fileExt - File extension
   * @param {string} outputFolder - Output folder path
   * @returns {string|null} Output path or null if setup failed
   */
  setupOutputPath(videoId, fileExt, outputFolder) {
    try {
      const filename = `${videoId}.${fileExt}`;
      const outputPath = path.join(outputFolder, filename);

      // Create output folder if it doesn't exist
      const dirname = path.resolve(outputFolder);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      return outputPath;
    } catch (error) {
      logger.error(`Failed to set up output path: ${error.message}`);
      this.safeEmit('error', {
        status: 500,
        message: `Failed to set up output path: ${error.message}`,
      });
      return null;
    }
  }

  /**
   * Perform the actual download of the audio
   * @param {string} videoUrl - YouTube video URL
   * @param {Object} bestAudio - Selected audio format
   * @param {string} outputPath - Path to save the file
   * @param {string} videoId - Video ID
   */
  async performDownload(videoUrl, bestAudio, outputPath, videoId) {
    logger.verbose(`Starting download to ${outputPath}...`);

    // Set up progress tracking
    const totalBytes = parseInt(bestAudio.contentLength, 10);
    const progressBar = new ProgressBar(
      'Downloading [:bar] :rate/bps :percent :etas',
      {
        total: totalBytes || 1000000, // Use a default if contentLength is missing
        width: 40,
      },
    );

    // Set up download streams
    const stream = ytdl(videoUrl, { format: bestAudio });
    const writeStream = fs.createWriteStream(outputPath);

    // Track if we've already cleaned up
    let hasCleanedUp = false;

    // Function to clean up resources and handle errors
    const cleanup = (error, deleteFile = true) => {
      if (hasCleanedUp) return; // Prevent multiple cleanups
      hasCleanedUp = true;

      // Destroy streams if they're still active
      try {
        stream.destroy();
      } catch (e) {
        logger.verbose(`Error destroying stream: ${e.message}`);
      }

      try {
        writeStream.close();
      } catch (e) {
        logger.verbose(`Error closing write stream: ${e.message}`);
      }

      // Delete the file if requested and it exists
      if (deleteFile && fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          logger.verbose(`Deleted incomplete file: ${outputPath}`);
        } catch (e) {
          logger.verbose(`Error deleting file: ${e.message}`);
        }
      }

      // Emit error event if an error was provided
      if (error) {
        this.safeEmit('error', {
          status: 500,
          message: error.message || 'Download failed',
          videoId,
        });
      }
    };

    // Handle stream events
    stream.on('error', (error) => {
      logger.error(`Download stream error: ${error.message}`);
      cleanup(error);
    });

    writeStream.on('error', (error) => {
      logger.error(`File write error: ${error.message}`);
      cleanup(error);
    });

    // Update progress
    stream.on('progress', (chunkLength) => {
      progressBar.tick(chunkLength);
    });

    // Handle completion
    writeStream.on('finish', () => {
      // Check if download actually completed successfully
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);

        // Consider download successful if file exists and either:
        // - Progress bar is complete, or
        // - File size is reasonable (> 100KB)
        if (progressBar.complete || stats.size > 102400) {
          logger.verbose(`Download completed: ${outputPath}`);
          this.safeEmit('success', { status: 200, videoId, outputPath });
        } else {
          logger.error('Download appears incomplete based on file size.');
          cleanup(new Error('Download incomplete'), true);
        }
      } else {
        logger.error('Output file does not exist after download.');
        cleanup(new Error('Output file missing'), false);
      }
    });

    // Pipe the download stream to the file
    stream.pipe(writeStream);
  }

  /**
   * Perform the fallback download of the video
   * @param {string} videoUrl - YouTube video URL
   * @param {string} outputPath - Path to save the file
   * @param {string} videoId - Video ID
   */
  async performFallbackDownload(videoUrl, outputPath, videoId) {
    logger.verbose(`Starting fallback download to ${outputPath}...`);

    // Create a progress bar
    const progressBar = new ProgressBar(
      'Downloading [:bar] :rate/bps :percent :etas',
      {
        total: 1000000, // Default total size (will be updated dynamically)
        width: 40,
        clear: true, // Clear the line after completion
      },
    );

    // Set up download streams
    const stream = ytdl(videoUrl);
    const writeStream = fs.createWriteStream(outputPath);

    // Track if we've already cleaned up
    let hasCleanedUp = false;

    // Function to clean up resources and handle errors
    const cleanup = (error, deleteFile = true) => {
      if (hasCleanedUp) return; // Prevent multiple cleanups
      hasCleanedUp = true;

      // Destroy streams if they're still active
      try {
        stream.destroy();
      } catch (e) {
        logger.verbose(`Error destroying stream: ${e.message}`);
      }

      try {
        writeStream.close();
      } catch (e) {
        logger.verbose(`Error closing write stream: ${e.message}`);
      }

      // Delete the file if requested and it exists
      if (deleteFile && fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          logger.verbose(`Deleted incomplete file: ${outputPath}`);
        } catch (e) {
          logger.verbose(`Error deleting file: ${e.message}`);
        }
      }

      // Emit error event if an error was provided
      if (error) {
        this.safeEmit('error', {
          status: 500,
          message: error.message || 'Fallback download failed',
          videoId,
        });
      }
    };

    // Handle stream events
    stream.on('response', (response) => {
      const totalBytes = parseInt(response.headers['content-length'], 10);
      if (totalBytes) {
        progressBar.total = totalBytes; // Update progress bar total size
      }
    });

    stream.on('data', (chunk) => {
      progressBar.tick(chunk.length); // Update progress bar with chunk size
    });

    stream.on('error', (error) => {
      logger.error(`Fallback download stream error: ${error.message}`);
      cleanup(error);
    });

    writeStream.on('error', (error) => {
      logger.error(`Fallback file write error: ${error.message}`);
      cleanup(error);
    });

    // Handle completion
    writeStream.on('finish', () => {
      // Check if download actually completed successfully
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);

        // Consider download successful if file exists and either:
        // - Progress bar is complete, or
        // - File size is reasonable (> 100KB)
        if (progressBar.complete || stats.size > 102400) {
          logger.verbose(`Fallback download completed: ${outputPath}`);
          this.safeEmit('success', { status: 200, videoId, outputPath });
        } else {
          logger.error(
            'Fallback download appears incomplete based on file size.',
          );
          cleanup(new Error('Fallback download incomplete'), true);
        }
      } else {
        logger.error('Fallback output file does not exist after download.');
        cleanup(new Error('Fallback output file missing'), false);
      }
    });

    // Pipe the download stream to the file
    stream.pipe(writeStream);
  }

  /**
   * Safely emit an event, ensuring that only one event is emitted per download
   * @param {string} event - Event name ('success', 'failure', or 'error')
   * @param {Object} data - Event data
   */
  safeEmit(event, data) {
    if (this.hasEmittedEvent) {
      logger.verbose(`Prevented duplicate emission of ${event} event`);
      return;
    }

    this.hasEmittedEvent = true;
    this.emit(event, data);
  }
}

module.exports = Downloader;
