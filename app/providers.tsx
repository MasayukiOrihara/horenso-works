"use client";

import { SessionFlagsProvider } from "@/components/provider/SessionFlagsProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionFlagsProvider>{children}</SessionFlagsProvider>;
}
