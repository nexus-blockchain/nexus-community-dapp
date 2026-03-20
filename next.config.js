/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  webpack: (config, { isServer }) => {
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
