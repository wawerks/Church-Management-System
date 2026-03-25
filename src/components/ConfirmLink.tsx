"use client";

import Link from "next/link";

type ConfirmLinkProps = Omit<React.ComponentProps<typeof Link>, "onClick"> & {
  confirmMessage?: string;
};

export function ConfirmLink({
  confirmMessage = "Are you sure you want to continue?",
  ...props
}: ConfirmLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    />
  );
}

