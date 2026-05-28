const fs = require('fs');
const path = require('path');

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const i = line.indexOf('=');
        return [line.slice(0, i), line.slice(i + 1)];
      })
  );
}

const localEnv = loadLocalEnv();

module.exports = {
  apps: [{
    name: 'focuspomo',
    script: 'node_modules/.bin/next',
    args: 'start -p 3457',
    cwd: '/root/projects/focuspomo',
    exec_mode: 'fork',
    env: {
      ...localEnv,
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=512',
      NEXT_PUBLIC_APP_URL: localEnv.NEXT_PUBLIC_APP_URL || 'https://focuspomo.bz9.me',
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '600M',
    restart_delay: 3000,
    max_restarts: 100,
    min_uptime: 5000,
  }],
};
