/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // genlayer-js ships untranspiled ESM deps — let Next handle them.
  transpilePackages: ["genlayer-js"],
};

export default nextConfig;
