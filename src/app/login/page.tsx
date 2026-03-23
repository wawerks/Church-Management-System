import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="flex items-center justify-center">
        <LoginForm />
      </div>
    </main>
  );
}

