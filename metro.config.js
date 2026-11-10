const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");
const { withStorybook } = require("@storybook/react-native/metro/withStorybook");

const storybookEnabled = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true";

const config = getDefaultConfig(__dirname);

// Expo's default Metro config omits "web" from resolver.platforms, so files like
// MapView.web.tsx are never considered — only the bare MapView.tsx is resolved,
// even when bundling for web. Add it so platform-specific files actually take effect.
config.resolver.platforms = ["ios", "android", "web"];

// Storybook runs as its own Metro server (`npm run storybook`, port 6006)
// alongside the app's (`npm start`, 8081). EXPO_PUBLIC_* values are inlined at
// transform time, so it gets a separate transform cache -- otherwise either
// server could serve files compiled for the other.
if (storybookEnabled) {
  config.cacheStores = [
    new FileStore({ root: path.join(__dirname, "node_modules/.cache/metro-storybook") }),
  ];
}

// Storybook is stripped from the bundle unless EXPO_PUBLIC_STORYBOOK_ENABLED is
// "true" (see the `storybook` npm script); when enabled, app/_layout.tsx renders
// it in place of the app. configPath must be absolute: the disabled-mode stub
// swap matches it against resolved (absolute) file paths.
module.exports = withStorybook(config, {
  enabled: storybookEnabled,
  configPath: path.resolve(__dirname, ".rnstorybook"),
});
