import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 // ✅ Correcció: desactivar typedRoutes si no el necessites
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
       pathname: '/**', // ✅ permet totes les rutes de icons8
     },
   ],
 },
 
};

export default nextConfig;
