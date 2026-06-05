import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import FirebaseBootstrap from "@/components/FirebaseBootstrap";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "GhostToGhost",
  description: "Anonymous ghost-to-ghost messaging",
};

export const viewport: Viewport = {
  themeColor: "#001c8a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        <AuthProvider>
          <FirebaseBootstrap />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
