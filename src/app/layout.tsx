import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThirdSpaceList - Find Your Perfect Work Spot",
  description: "Discover work-friendly cafes, libraries, and community spots with real-time data on WiFi, noise levels, and amenities.",
  keywords: ["coworking", "cafe", "library", "remote work", "wifi", "study space"],
  authors: [{ name: "ThirdSpaceList Team" }],
  creator: "ThirdSpaceList",
  publisher: "ThirdSpaceList",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ThirdSpaceList",
    startupImage: "/icon-512.png",
  },
  openGraph: {
    type: "website",
    siteName: "ThirdSpaceList",
    title: "ThirdSpaceList - Find Your Perfect Work Spot",
    description: "Discover work-friendly cafes, libraries, and community spots with real-time data on WiFi, noise levels, and amenities.",
    url: "https://thirdspacelist.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ThirdSpaceList",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ThirdSpaceList - Find Your Perfect Work Spot",
    description: "Discover work-friendly cafes, libraries, and community spots with real-time data on WiFi, noise levels, and amenities.",
    images: ["/og-image.png"],
    creator: "@thirdspacelist",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('SW registered: ', registration);
                  }, function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
