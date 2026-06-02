import { useState } from "react";
import { useStore } from "@/lib/store";
import { Redirect, useLocation } from "wouter";
import { toast } from "sonner";

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated } = useStore();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || !password) {
      toast.error("Please fill in all credential fields");
      return;
    }

    setSubmitting(true);
    const success = await login(mobile, password);
    setSubmitting(false);

    if (success) {
      toast.success("Welcome back to DineDash!");
      setLocation("/");
    } else {
      toast.error("Invalid restaurant credentials. Please try again.");
    }
  };

  if (isAuthenticated) {
    setLocation("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans text-zinc-100">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-800 bg-background p-8 backdrop-blur-sm">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-orange-500">
            Dinedash admin panel
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Merchant Dashboard Authentication Portal
          </p>
        </div>

        <form className="mt-8  space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Mobile Number
              </label>
              <input
                type="text"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm"
                placeholder="e.g. 9876543210"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="group relative flex w-full justify-center rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
            >
              {submitting ? "Verifying Credentials..." : "Access Dashboard"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
