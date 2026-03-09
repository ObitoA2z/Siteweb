import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/70 bg-white/70 py-8">
      <div className="shell flex flex-col gap-3 text-sm text-[#5f4754] md:flex-row md:items-center md:justify-between">
        <p>(c) {new Date().getFullYear()} Atelier Cils Paris - Rehaussement de cils.</p>
        <div className="flex items-center gap-4">
          <Link href="/contact" className="hover:text-[#2d1e27]">
            Contact
          </Link>
          <Link href="/faq" className="hover:text-[#2d1e27]">
            FAQ
          </Link>
        </div>
      </div>
    </footer>
  );
}
