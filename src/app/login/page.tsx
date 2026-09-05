import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in | Hasinah Confectionery & Restaurant",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--background)]">
            <span className="text-lg font-extrabold tracking-tight">H</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            HASINAH
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Confectionery &amp; Restaurant — Admin
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}