import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { getAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  LOYALTY_REWARD_DISCOUNT,
  LOYALTY_REWARD_THRESHOLD,
  REFERRAL_BONUS_POINTS,
} from "@/lib/loyalty";

interface LoyaltyRow {
  id: number;
  name: string;
  email: string;
  loyaltyPoints: number;
  referralCode: string | null;
  totalReferrals: number;
  rewardedReferrals: number;
}

function getLoyaltyOverview(): LoyaltyRow[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        cu.id,
        cu.name,
        cu.email,
        COALESCE(cu.loyalty_points, 0)   AS loyaltyPoints,
        cu.referral_code                  AS referralCode,
        COUNT(r.id)                       AS totalReferrals,
        SUM(CASE WHEN r.status = 'rewarded' THEN 1 ELSE 0 END) AS rewardedReferrals
      FROM customer_users cu
      LEFT JOIN referrals r ON r.referrer_id = cu.id
      GROUP BY cu.id
      ORDER BY loyaltyPoints DESC
      LIMIT 100
      `,
    )
    .all() as LoyaltyRow[];
}

export default async function AdminFidelitePage() {
  const session = await getAdminSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const customers = getLoyaltyOverview();
  const totalWithPoints = customers.filter((c) => c.loyaltyPoints > 0).length;
  const totalWithReward = customers.filter(
    (c) => c.loyaltyPoints >= LOYALTY_REWARD_THRESHOLD,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Admin</p>
        <h1 className="text-4xl font-bold">Programme fidélité</h1>
        <p className="mt-2 text-sm text-[#5f4754]">
          {totalWithPoints} cliente(s) avec des points •{" "}
          {totalWithReward} cliente(s) éligible(s) à une remise -{LOYALTY_REWARD_DISCOUNT}%
        </p>
      </div>

      <AdminNav />

      {/* Règles du programme */}
      <section className="card p-5 space-y-2">
        <h2 className="font-bold text-lg">Règles du programme</h2>
        <ul className="text-sm text-[#5f4754] space-y-1 list-disc list-inside">
          <li>1 séance confirmée = <strong>1 point</strong></li>
          <li>
            <strong>{LOYALTY_REWARD_THRESHOLD} points</strong> = remise de{" "}
            <strong>-{LOYALTY_REWARD_DISCOUNT}%</strong> sur la prochaine séance
          </li>
          <li>
            1 parrainage validé (amie qui réserve) = <strong>+{REFERRAL_BONUS_POINTS} points</strong> pour la marraine
          </li>
        </ul>
      </section>

      {customers.length === 0 ? (
        <div className="card p-8 text-center text-[#5f4754]">
          Aucune cliente inscrite pour le moment.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#2d1e2714]">
          <table className="w-full text-sm">
            <thead className="bg-[#fdf7f9] text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-[#5f4754]">Cliente</th>
                <th className="px-4 py-3 font-semibold text-[#5f4754]">Points</th>
                <th className="px-4 py-3 font-semibold text-[#5f4754]">Statut</th>
                <th className="px-4 py-3 font-semibold text-[#5f4754]">Code parrainage</th>
                <th className="px-4 py-3 font-semibold text-[#5f4754]">Filleules</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d1e2708]">
              {customers.map((c) => {
                const hasReward = c.loyaltyPoints >= LOYALTY_REWARD_THRESHOLD;
                const pointsInCycle = c.loyaltyPoints % LOYALTY_REWARD_THRESHOLD;
                const nextReward = LOYALTY_REWARD_THRESHOLD - pointsInCycle;

                return (
                  <tr key={c.id} className="hover:bg-[#fdf7f9] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-[#8a6578]">{c.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-[#2d1e27]">{c.loyaltyPoints}</span>
                      <span className="text-xs text-[#8a6578] ml-1">pts</span>
                    </td>
                    <td className="px-4 py-3">
                      {hasReward ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          -{LOYALTY_REWARD_DISCOUNT}% disponible
                        </span>
                      ) : (
                        <span className="text-xs text-[#8a6578]">
                          encore {nextReward} séance{nextReward > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.referralCode ? (
                        <code className="rounded bg-[#f5eef1] px-2 py-0.5 text-xs font-mono text-[#c48fa3]">
                          {c.referralCode}
                        </code>
                      ) : (
                        <span className="text-xs text-[#c9b0bb]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{c.totalReferrals}</span>
                      {c.rewardedReferrals > 0 && (
                        <span className="text-xs text-[#8a6578] ml-1">
                          ({c.rewardedReferrals} validé{c.rewardedReferrals > 1 ? "s" : ""})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
