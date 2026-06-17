import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiDir = path.join(root, "src", "app", "api");
const hiddenApiDir = path.join(root, "src", "app", "__api_capacitor_hidden");
const proxyFile = path.join(root, "src", "proxy.ts");
const hiddenProxyFile = path.join(root, "src", "__proxy_capacitor_hidden.ts");

if (fs.existsSync(hiddenApiDir)) {
  throw new Error(`Refusing to build while ${hiddenApiDir} already exists`);
}
if (fs.existsSync(hiddenProxyFile)) {
  throw new Error(`Refusing to build while ${hiddenProxyFile} already exists`);
}

let moved = false;
let movedProxy = false;
try {
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, hiddenApiDir);
    moved = true;
  }
  if (fs.existsSync(proxyFile)) {
    fs.renameSync(proxyFile, hiddenProxyFile);
    movedProxy = true;
  }
  const result = spawnSync(
    process.execPath,
    [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build", "--webpack"],
    {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, CAPACITOR_BUILD: "1" },
    }
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  if (movedProxy) fs.renameSync(hiddenProxyFile, proxyFile);
  if (moved) fs.renameSync(hiddenApiDir, apiDir);
}
