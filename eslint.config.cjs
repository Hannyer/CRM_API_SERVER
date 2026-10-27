module.exports = [
  { ignores: ['node_modules/**', 'src/generated/**', 'dist/**'] },
  {
    files: ['app.js', 'server.js', 'src/**/*.js', 'tests/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs',
      globals: Object.fromEntries(['process','console','Buffer','URL','URLSearchParams','AbortSignal','AbortController','fetch','setTimeout','clearTimeout','setInterval','clearInterval','__dirname','__filename'].map(name => [name, 'readonly'])),
    },
    rules: { 'no-undef': 'error', 'no-unreachable': 'error', 'no-duplicate-case': 'error', 'no-constant-condition': 'error' },
  },
];
