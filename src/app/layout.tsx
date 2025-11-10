import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Along - Productivity Companion",
  description: "Your gentle productivity companion for breaking tasks into manageable steps and maintaining focus.",
};

import { validateEnv } from '@/lib/env';

// Validate environment variables at startup
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
