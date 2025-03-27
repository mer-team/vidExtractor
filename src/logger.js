// src/logger.js
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(
      (info) =>
        `[${info.timestamp}] [${info.level.toUpperCase()}] ${info.message}`,
    ),
  ),
  transports: [
    new transports.Console(),
    new transports.DailyRotateFile({
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '7d', // Keep logs for 7 days
    }),
  ],
});

module.exports = logger;
