import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PoriChat - Connect with Strangers Instantly",
  description: "A modern, anonymous chat platform. Connect with random strangers, make friends, and have fun conversations. Supports English and Bengali.",
  keywords: ["PoriChat", "chat", "anonymous", "stranger chat", "random chat", "bangla chat", "bengali"],
  authors: [{ name: "AI Multitool" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "PoriChat - Connect with Strangers Instantly",
    description: "Modern anonymous chat platform with real-time messaging",
    siteName: "PoriChat",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              className: "neo-card-sm border-none",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
