const fs = require('fs');
const ytdl = require('@distube/ytdl-core');

/**
 * Downloads a YouTube video and resolves when the download is complete.
 * @param {string} url - The YouTube video URL.
 * @param {string} outputPath - The path to save the downloaded file.
 * @returns {Promise<void>}
 */
function downloadYouTubeVideo(url, outputPath) {
  return new Promise((resolve, reject) => {
    const stream = ytdl(url);
    const fileStream = fs.createWriteStream(outputPath);

    stream.pipe(fileStream);

    // Handle events to track download progress
    stream.on('error', (error) => {
      reject(`Download failed: ${error.message}`);
    });

    fileStream.on('finish', () => {
      console.log(`Download complete: ${outputPath}`);
      resolve();
    });

    fileStream.on('error', (error) => {
      reject(`File write failed: ${error.message}`);
    });
  });
}

// Example usage:
(async () => {
  try {
    console.log('Starting download...');
    await downloadYouTubeVideo(
      'https://www.youtube.com/watch?v=pS22yZBYL7o',
      'video.mp4',
    );
    console.log('Download finished successfully!');
  } catch (error) {
    console.error(error);
  }
})();
