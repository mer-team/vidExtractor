module.exports = {
  '*.js': ['npx eslint --fix', 'npx prettier --write'],
  '*.md': ['npx markdownlint --fix'],
  '*.yml': ['npx yaml-lint'],
  'Dockerfile*': ['hadolint'],
};
