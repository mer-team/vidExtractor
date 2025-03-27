const Table = require('cli-table3');

function logAvailableStreams(info) {
  if (process.env.LOG_LEVEL !== 'debug') return;

  console.log('  [ℹ] Available Audio Streams:');
  const audioStreamsTable = new Table({
    head: [
      'Container',
      'Bitrate',
      'Codec',
      'SampleRate',
      'Channels',
      'Quality',
    ],
    style: { head: ['cyan'], border: ['grey'] },
  });

  info.formats
    .filter((format) => format.mimeType.includes('audio'))
    .forEach((format) => {
      audioStreamsTable.push([
        format.container,
        `${format.audioBitrate} kbps`,
        format.audioCodec,
        format.audioSampleRate,
        format.audioChannels,
        format.audioQuality,
      ]);
    });

  console.log(audioStreamsTable.toString());

  console.log('  [ℹ] Available Video Streams:');
  const videoStreamsTable = new Table({
    head: [
      'Container',
      'Bitrate',
      'Codec',
      'Quality',
      'FPS',
      'Has Audio?',
      'AudioBitrate',
    ],
    style: { head: ['cyan'], border: ['grey'] },
  });

  info.formats
    .filter((format) => format.mimeType.includes('video'))
    .forEach((format) => {
      videoStreamsTable.push([
        format.container,
        `${format.bitrate} kbps`,
        format.codecs,
        format.qualityLabel,
        format.fps,
        format.hasAudio,
        format.audioBitrate,
      ]);
    });

  console.log(videoStreamsTable.toString());
}

module.exports = { logAvailableStreams };
