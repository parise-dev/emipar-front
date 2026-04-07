"use client";

import { Topbar } from "./topbar";

// Compat layer: some layouts import <Header/>
export function Header() {
  return <Topbar />;
}
