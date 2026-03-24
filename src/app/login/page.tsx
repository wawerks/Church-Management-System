import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <LoginForm />
    </main>
  );
}

