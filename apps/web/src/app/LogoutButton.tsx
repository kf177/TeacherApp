"use client";
import { createClientBrowser } from "@/lib/supabaseClient";

export default function LogoutButton() {
  const supabase = createClientBrowser();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // ✅ Redirect to the home selector (principal / teacher)
    window.location.href = "/";
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm underline hover:opacity-80"
      title="Sign out"
    >
      Log out
    </button>
  );
}
