"use client";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default function HeaderClient() {
  const pathname = usePathname();
  if (pathname?.startsWith("/login")) return null;

  return (
    <header className="flex justify-end p-4 border-b border-gray-800">
      <LogoutButton />
    </header>
  );
}
