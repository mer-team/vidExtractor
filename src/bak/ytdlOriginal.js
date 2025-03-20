const ytdl = require('@distube/ytdl-core');
const fs = require('fs');

// Download a video
const stream = ytdl('https://www.youtube.com/watch?v=pS22yZBYL7o');
const w = fs.createWriteStream('video.mp4');

stream.on('end', () => {
  console.log('Goodbye\n');
});

stream.on('close', () => {
  console.log('Closed\n');
});

stream.on('error', (err) => {
  console.error(`Error: ${err.message}`);
});

stream.on('info', (info) => {
  console.log(`Info: ${info}`);
});

stream.on('response', (response) => {
  console.log(`Response: ${response}`);
});

stream.on('progress', (chunkLength, downloaded, total) => {
  console.log(`Progress: ${chunkLength}, ${downloaded}, ${total}`);
});

// stream.on('data', (chunk) => {
//   console.log(`Data: ${chunk}`);
// });

w.on('finish', () => {
  console.log('Finished\n');
});

w.on('error', (err) => {
  console.error(`Error: ${err.message}`);
});

w.on('close', () => {
  console.log('Closed\n');
});

w.on('pipe', () => {
  console.log('Piping\n');
});

w.on('unpipe', () => {
  console.log('Unpiping\n');
});

w.on('drain', () => {
  console.log('Draining\n');
});

stream.pipe(w);

// Download a video
