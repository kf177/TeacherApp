"use client";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default function HeaderClient() {
  const pathname = usePathname();

  // Explicit routes where we do NOT want the header
  const hideExact = ["/", "/login", "/teacher/login", "/principal/login"];

  // Only hide if pathname exactly matches one of those
  if (pathname && hideExact.includes(pathname)) {
    return null;
  }

  return (
    <header className="flex justify-end p-4 border-b border-gray-800">
      <LogoutButton />
    </header>
  );
}
