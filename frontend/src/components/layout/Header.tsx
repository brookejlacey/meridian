"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { FaucetButton } from "@/components/FaucetButton";

export function Header() {
  return (
    <header className="border-b border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold tracking-tight hover:text-zinc-300 transition-colors">
            Meridian Protocol
          </Link>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
            Fuji
          </span>
        </div>
        <div className="flex items-center gap-3">
          <FaucetButton />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
