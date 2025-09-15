import withNextIntl from 'next-intl/plugin'; // ✅ 1. Importa el plugin
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La teva configuració actual es manté intacta
  typedRoutes: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xrloavgcssycuiuptexa.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'img.icons8.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

// ✅ 2. Embolcalla la teva configuració amb withNextIntl
export default withNextIntl('./src/i18n.ts')(nextConfig);