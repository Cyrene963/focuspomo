#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const staticDir = path.join(root, '.next', 'static');
const swPath = path.join(root, 'public', 'sw.js');

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(?:js|css)$/.test(name)) out.push(p);
  }
  return out;
}

const assets = walk(staticDir)
  .map(p => '/_next/static/' + path.relative(staticDir, p).split(path.sep).join('/'))
  .sort();

const markerStart = '// __PRECACHE_NEXT_STATIC_START__';
const markerEnd = '// __PRECACHE_NEXT_STATIC_END__';
const block = `${markerStart}\nconst PRECACHE_NEXT_STATIC = ${JSON.stringify(assets, null, 2)};\n${markerEnd}`;

let sw = fs.readFileSync(swPath, 'utf8');
const re = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`);
if (!re.test(sw)) {
  throw new Error('precache marker not found in public/sw.js');
}
sw = sw.replace(re, block);

// 缓存名跟随构建 ID:每次部署后旧缓存在 activate 阶段被整体清掉,
// 避免固定缓存名长期堆积旧 chunk。
const buildIdPath = path.join(root, '.next', 'BUILD_ID');
if (fs.existsSync(buildIdPath)) {
  const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
  sw = sw.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'focuspomo-${buildId}';`);
}

fs.writeFileSync(swPath, sw);
console.log(`Injected ${assets.length} Next static assets into public/sw.js`);
