module.exports = {
  // Webpack 5 is one of the versions that supports ?. operations in the modules
  future: { webpack5: true },
  // To create relative paths in the index.html to run css locally w/o server since it is not supported in next export
  assetPrefix: ".",
  webpack: (config, { dev, isServer }) => {
    config.module.rules = [
      ...config.module.rules,
      {
        test: /\.(mjs|js|jsx)$/,
        include: /node_modules/,
        exclude: __dirname + "/node_modules/@blueprintjs/select/",
        resolve: { mainFields: ["esnext", "browser", "module", "main"] },
      },
    ];

    return config;
  },
};
