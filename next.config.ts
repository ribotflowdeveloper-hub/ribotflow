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


/**import withNextIntl from 'next-intl/plugin';
import nextBundleAnalyzer from '@next/bundle-analyzer'; // NOU: Importem el bundle analyzer
import type { NextConfig } from "next";

// NOU: Creem la instància de l'analitzador.
// Només s'activarà quan executis la build amb la variable ANALYZE=true.
const withBundleAnalyzer = nextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

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

// Creem la funció per embolcallar amb next-intl
const withIntl = withNextIntl('./src/i18n.ts');

// NOU: Embolcallem la configuració amb els dos plugins.
// Primer amb next-intl, i el resultat l'embolcallem amb el bundle-analyzer.
export default withBundleAnalyzer(withIntl(nextConfig));* */