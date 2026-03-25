"use client";

import { usePathname } from "next/navigation";

export default function ProtectedTemplate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const disablePageAnimation = pathname === "/profile/edit";
  const className = disablePageAnimation
    ? "min-h-full"
    : "page-transition min-h-full";

  return (
    <div key={pathname} className={className}>
      {children}
    </div>
  );
}
