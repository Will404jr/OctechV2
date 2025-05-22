// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'QMS',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
