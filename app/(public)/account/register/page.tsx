import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { CustomerRegisterForm } from "@/components/auth/CustomerRegisterForm";
import { customerAuthOptions } from "@/lib/customerAuth";

export default async function CustomerRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const session = await getServerSession(customerAuthOptions);
  if (session?.user) {
    redirect("/account");
  }

  const params = await searchParams;
  const referralCode = params.ref?.trim().toUpperCase().slice(0, 20) ?? "";

  return (
    <div className="shell">
      <CustomerRegisterForm initialReferralCode={referralCode} />
    </div>
  );
}
