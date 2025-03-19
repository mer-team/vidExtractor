// src/fileHandler.js
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function saveFile(filePath, dataStream) {
  logger.info(`starting saving file to ${filePath}`);
  return new Promise((resolve, reject) => {
    const fullPath = path.resolve(filePath);
    const writeStream = fs.createWriteStream(fullPath);
    dataStream.pipe(writeStream);
    writeStream.on('finish', () => {
      logger.info(`File saved to ${fullPath}`);
      resolve(fullPath);
    });
    writeStream.on('error', (err) => {
      logger.error(`Error saving file to ${fullPath}: ${err}`);
      reject(err);
    });
  });
}

module.exports = { saveFile };
