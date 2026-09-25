import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineGraph",
  description: "Descubra filmes a partir do gosto de pessoas parecidas com você.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Pôsteres vêm do CDN do TMDB: abre a conexão antes de o HTML pedir a primeira imagem. */}
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
      </head>
      <body className="min-h-screen antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
