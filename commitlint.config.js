// filepath: /workspaces/vid-extractor/commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [2, 'always', 100],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'ci',
        'chore',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
  },
};
