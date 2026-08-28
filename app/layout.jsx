import './globals.css';

export const metadata = {
  metadataBase: new URL('https://interactivenigeria.vercel.app'),
  title: 'The Nigeria History Museum | A Living Visual Archive',
  description: 'A visual history of the kingdoms, uprisings, and inventions that made a nation — from the terracotta sculptors of Nok to the tech innovators of Yaba.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png'
  },
  openGraph: {
    title: 'The Nigeria History Museum',
    description: 'A visual history of the kingdoms, uprisings, and inventions that made a nation — from Nok to Yaba.',
    url: 'https://interactivenigeria.vercel.app',
    siteName: 'The Nigeria History Museum',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'The Nigeria History Museum - A Visual History of Nigerian Civilizations, Eras, and Innovations'
      }
    ],
    locale: 'en_NG',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Nigeria History Museum',
    description: 'A visual history of the kingdoms, uprisings, and inventions that made a nation.',
    creator: '@_Halel',
    images: ['/og-image.jpg']
  }
};

export const viewport = {
  themeColor: '#f4efe6',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,800,900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
