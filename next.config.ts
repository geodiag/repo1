/** @type {import('next').NextConfig} */
const nextConfig = {
  // Supprimez la section experimental si elle cause une erreur
  async headers() {
    return [
      {
        source: "/_next/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
}

module.exports = nextConfig