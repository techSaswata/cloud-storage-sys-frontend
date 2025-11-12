import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { FilesProvider } from "@/contexts/FilesContext";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "OneDrive",
  description: "A cloud storage application built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <UserProvider>
            <SidebarProvider>
              <FilesProvider>{children}</FilesProvider>
            </SidebarProvider>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
