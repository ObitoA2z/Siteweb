import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { CustomerLoginForm } from "@/components/auth/CustomerLoginForm";
import { customerAuthOptions } from "@/lib/customerAuth";

type Props = {
  searchParams: Promise<{
    callbackUrl?: string;
    email?: string;
  }>;
};

export default async function CustomerLoginPage({ searchParams }: Props) {
  const session = await getServerSession(customerAuthOptions);
  if (session?.user) {
    redirect("/account");
  }

  const params = await searchParams;

  return (
    <div className="shell">
      <CustomerLoginForm
        callbackUrl={params.callbackUrl || "/account"}
        initialEmail={params.email || ""}
      />
    </div>
  );
}
