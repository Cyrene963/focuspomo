# FocusPomo iOS App Store Build

This project now has a Capacitor iOS shell that keeps the existing FocusPomo UI while replacing PWA-only device features with native-capable adapters.

## What Is Native-Capable Now

- Timer completion notifications use Capacitor Local Notifications in the iOS app and Web Notifications in the browser.
- Completion feedback uses Capacitor Haptics in the iOS app and `navigator.vibrate` on supported browsers.
- Tomato tilt physics can use Capacitor Motion inside the iOS app and the existing DeviceMotion/DeviceOrientation path on the web. Capacitor Motion 8 is implemented with Web APIs, so a later custom Swift Core Motion plugin is still the best route if the App Store build needs fully native sensor delivery.
- Cloud sync calls use the hosted FocusPomo service from the app package, while the web deployment still uses relative `/api/*` routes.
- The service worker is skipped inside the Capacitor app and still registers for the hosted PWA.

## Build Commands

```bash
npm install
npm run build:ios
npx cap sync ios
npx cap open ios
```

`npm run cap:sync:ios` runs the build and sync together.

## Unsigned IPA for Sideloading

An `.ipa` must be built on macOS with Xcode. On macOS, run:

```bash
bash scripts/build-unsigned-ipa.sh
```

The output is:

```text
dist/FocusPomo-unsigned.ipa
```

This is intentionally unsigned. Use Sideloadly, AltStore, or another signing tool to sign it with your Apple ID for device testing.

The GitHub Actions workflow `.github/workflows/ios-unsigned-ipa.yml` can also produce the same unsigned IPA as a downloadable artifact from a macOS runner.

## macOS / Xcode Handoff

The native iOS project is in `ios/App`. Final App Store packaging must be done on macOS with Xcode:

1. Open `ios/App/App.xcworkspace` or run `npm run cap:open:ios`.
2. Set the Apple Team and signing profile.
3. Confirm bundle id `me.cyrene.focuspomo` or change it in `capacitor.config.ts` and Xcode.
4. Replace generated app icons and launch assets with final production assets.
5. Test on a real iPhone/iPad:
   - local notification permission and delivery after timer completion
   - haptic completion feedback
   - tilt tomatoes with Motion permission; if WKWebView does not deliver stable readings, add a small Core Motion Capacitor plugin
   - offline launch of the bundled app
   - Google login, cloud sync, and Calendar authorization
6. Archive and upload through Xcode Organizer.

For App Store or TestFlight distribution, do not use the unsigned IPA. Use Xcode archive/export with an Apple Developer Team, a distribution certificate, and the matching provisioning profile.

## App Review Notes

Apple can reject apps that are only a repackaged website. This shell should be submitted as a device-native productivity app, with the native notification, haptic, motion, offline timer, and local-first behavior emphasized in review notes.

The hosted server remains responsible for Google OAuth, cloud sync, Calendar sync, and Agent keys. Do not put Google client secrets, database URLs, or agent keys in the iOS app bundle.
