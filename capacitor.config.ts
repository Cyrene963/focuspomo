import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "me.cyrene.focuspomo",
  appName: "FocusPomo",
  webDir: "out",
  ios: {
    contentInset: "always",
    scheme: "focuspomo",
  },
  server: {
    iosScheme: "capacitor",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#E8644E",
    },
  },
};

export default config;
