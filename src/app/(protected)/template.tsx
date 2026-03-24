"use client";

import { usePathname } from "next/navigation";

export default function ProtectedTemplate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-transition min-h-full">
      {children}
    </div>
  );
}
