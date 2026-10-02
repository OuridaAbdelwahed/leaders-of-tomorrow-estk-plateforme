import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Leaders of Tomorrow ESTK',
    short_name: 'Leaders ESTK',
    description: 'Student leadership, events, and community impact at EST Khenifra.',
    start_url: '/en',
    display: 'standalone',
    background_color: '#F7FAF8',
    theme_color: '#0D5964',
    lang: 'en',
    dir: 'auto',
    categories: ['education', 'community', 'events'],
    icons: [
      { src: '/brand/favicon_192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/favicon_512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
