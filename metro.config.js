const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Expo's default Metro config omits "web" from resolver.platforms, so files like
// MapView.web.tsx are never considered — only the bare MapView.tsx is resolved,
// even when bundling for web. Add it so platform-specific files actually take effect.
config.resolver.platforms = ["ios", "android", "web"];

module.exports = config;
