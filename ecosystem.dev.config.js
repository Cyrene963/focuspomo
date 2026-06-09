module.exports = {
  apps: [{
    name: 'focuspomo',
    script: 'node_modules/.bin/next',
    args: ['dev', '-p', '3457'],
    cwd: '/root/projects/focuspomo',
    node_args: '--max-old-space-size=512',
    env: {
      NODE_ENV: 'development',
      PORT: '3457'
    },
    max_memory_restart: '400M',
    autorestart: true,
    watch: false
  }]
};
