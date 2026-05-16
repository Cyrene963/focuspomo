module.exports = {
  apps: [{
    name: 'focuspomo',
    script: 'npx',
    args: 'next start -p 3457',
    cwd: '/root/projects/focuspomo',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=256',
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '300M',
  }],
};
