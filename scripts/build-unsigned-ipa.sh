#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is required. Build this on macOS with Xcode installed." >&2
  exit 1
fi

BUILD_DIR="$ROOT/build/ios"
DERIVED_DATA="$BUILD_DIR/DerivedData"
IPA_ROOT="$BUILD_DIR/ipa-root"
OUT_DIR="$ROOT/dist"
OUT_IPA="$OUT_DIR/FocusPomo-unsigned.ipa"

rm -rf "$BUILD_DIR" "$OUT_IPA"
mkdir -p "$BUILD_DIR" "$OUT_DIR"

npm run cap:sync:ios

xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -derivedDataPath "$DERIVED_DATA" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  build

APP_PATH="$(find "$DERIVED_DATA/Build/Products/Release-iphoneos" -maxdepth 1 -name '*.app' -type d | head -n 1)"
if [[ -z "${APP_PATH:-}" ]]; then
  echo "Could not find built .app under $DERIVED_DATA/Build/Products/Release-iphoneos" >&2
  exit 1
fi

mkdir -p "$IPA_ROOT/Payload"
cp -R "$APP_PATH" "$IPA_ROOT/Payload/FocusPomo.app"

(cd "$IPA_ROOT" && /usr/bin/zip -qry "$OUT_IPA" Payload)

echo "Unsigned IPA written to $OUT_IPA"
echo "Use Sideloadly, AltStore, or a signing service to sign this IPA for your device."
