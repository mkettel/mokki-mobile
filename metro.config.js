const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Fix tslib ESM/CJS interop issue on web (autolinker → tslib)
// Metro resolves to tslib/modules/index.js which breaks on web.
// Force it to use the proper ESM bundle instead.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "tslib" && platform === "web") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "node_modules/tslib/tslib.es6.mjs"),
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
