import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { CustomerLoginForm } from "@/components/auth/CustomerLoginForm";
import { customerAuthOptions } from "@/lib/customerAuth";

type Props = {
  searchParams: Promise<{
    callbackUrl?: string;
    email?: string;
    registered?: string;
  }>;
};

function sanitizeCallbackUrl(value?: string): string {
  if (!value) {
    return "/account";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }

  return value;
}

export default async function CustomerLoginPage({ searchParams }: Props) {
  const session = await getServerSession(customerAuthOptions);
  if (session?.user) {
    redirect("/account");
  }

  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl);
  const initialEmail = (params.email ?? "").trim().toLowerCase().slice(0, 160);
  const showRegisteredMessage = params.registered === "1";

  return (
    <div className="shell">
      <CustomerLoginForm
        callbackUrl={callbackUrl}
        initialEmail={initialEmail}
        showRegisteredMessage={showRegisteredMessage}
      />
    </div>
  );
}
