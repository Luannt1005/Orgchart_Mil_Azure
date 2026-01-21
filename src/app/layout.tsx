import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import AppFooter from "@/components/app.footer";
import PageTransition from "@/components/PageTransition";
import { UserProvider } from "@/app/context/UserContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrgChart TTI SHTP",
  description: "Organization Chart Management System",
  icons: {
    icon: "/Milwaukee-logo-red.png",
    shortcut: "/Milwaukee-logo-red.png",
    apple: "/Milwaukee-logo-red.png",
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
        className={`${geistSans.variable} ${geistMono.variable} bg-[var(--color-bg-page)]`}
        suppressHydrationWarning
      >
        <UserProvider>
          <div className="flex w-full h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 h-full">
              <Header />
              <main className="flex-1 overflow-auto bg-[var(--color-bg-page)] relative scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent transition-colors duration-300 flex flex-col">
                <div className="p-4 flex-1">
                  <PageTransition>
                    {children}
                  </PageTransition>
                </div>
                <AppFooter />
              </main>
            </div>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}

