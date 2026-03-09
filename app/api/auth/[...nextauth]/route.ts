import NextAuth from "next-auth";

import { customerAuthOptions } from "@/lib/customerAuth";

const handler = NextAuth(customerAuthOptions);

export { handler as GET, handler as POST };
