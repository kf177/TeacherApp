import type { Metadata } from "next";
import "./globals.css";
import HeaderClient from "./HeaderClient";  // ✅ add
import ProfileSync from "./ProfileSync";    // optional, if you already use it

export const metadata: Metadata = {
  title: "Teacher Substitute App",
  description: "Connect principals and substitute teachers efficiently",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <ProfileSync />
        <HeaderClient />        {/* ✅ renders the Logout button globally */}
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
