import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { CustomerRegisterForm } from "@/components/auth/CustomerRegisterForm";
import { customerAuthOptions } from "@/lib/customerAuth";

export default async function CustomerRegisterPage() {
  const session = await getServerSession(customerAuthOptions);
  if (session?.user) {
    redirect("/account");
  }

  return (
    <div className="shell">
      <CustomerRegisterForm />
    </div>
  );
}
