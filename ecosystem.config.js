module.exports = {
  apps: [{
    name: 'focuspomo',
    script: 'node_modules/.bin/next',
    args: 'start -p 3457',
    cwd: '/root/projects/focuspomo',
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=512',
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '600M',
    restart_delay: 3000,
    max_restarts: 100,
    min_uptime: 5000,
  }],
};
