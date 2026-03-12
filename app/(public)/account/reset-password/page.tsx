import Link from "next/link";

import { CustomerResetPasswordForm } from "@/components/auth/CustomerResetPasswordForm";

type Props = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function CustomerResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = (params.token ?? "").trim();

  if (!token) {
    return (
      <div className="shell">
        <div className="card mx-auto max-w-md space-y-3 p-6">
          <h1 className="text-3xl font-bold">Lien invalide</h1>
          <p className="text-sm text-[#5f4754]">Le lien de reinitialisation est manquant ou invalide.</p>
          <Link href="/account/forgot-password" className="btn-main w-full text-center">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <CustomerResetPasswordForm token={token} />
    </div>
  );
}
