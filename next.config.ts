import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite compilar em outra pasta (ex.: NEXT_DIST_DIR=.next-verify) sem
  // interferir num "npm run dev" que esteja rodando ao mesmo tempo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Voltar para uma página vista há pouco (ex.: perfil → filme → perfil) é
    // instantâneo: o navegador reaproveita a versão que já tem por 60 s.
    staleTimes: { dynamic: 60 },
  },
  images: {
    // Pôsteres vêm direto do CDN do TMDB (já otimizados); sem cota de otimização da Vercel.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" }],
  },
};

export default nextConfig;
