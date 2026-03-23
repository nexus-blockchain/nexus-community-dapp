/** @type {import('next').NextConfig} */
const TerserPlugin = require('terser-webpack-plugin');

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  webpack: (config, { isServer }) => {
    // Fix: @noble/curves uses `\0` in strings which triggers
    // "Octal escape sequences are not allowed in template strings" when
    // Terser converts regular strings to template literals.
    // This affects both server (Node 22) AND client (Android WebView).
    config.optimization.minimizer = [
      new TerserPlugin({
        terserOptions: {
          ecma: 2020,
          compress: { ecma: 2020 },
          output: {
            // Keep backtick template literals as regular strings
            // to avoid octal-in-template-string errors
            ecma: 5,
          },
        },
      }),
    ];

    if (!isServer) {
      // @polkadot/util-crypto uses WASM internally — tell webpack to handle it
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };

      // Polkadot packages reference Node.js built-ins that don't exist in browsers.
      // Setting them to false tells webpack to provide an empty module instead of
      // failing at chunk load time.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        util: false,
        os: false,
        path: false,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
