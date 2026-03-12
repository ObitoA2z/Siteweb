import Link from "next/link";

type Props = {
  searchParams: Promise<{ bookingId?: string }>;
};

export default async function BookingConfirmationPage({ searchParams }: Props) {
  const params = await searchParams;
  const bookingId = params.bookingId;

  return (
    <div className="shell">
      <section className="card mx-auto max-w-2xl space-y-4 p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Confirmation</p>
        <h1 className="text-4xl font-bold">Demande en attente</h1>
        <p className="text-[#5f4754]">
          Merci pour ta confiance. Ta demande de reservation est en attente de validation par l&apos;admin.
          Un email de confirmation de reception t&apos;a ete envoye.
          Un second email te sera envoye apres validation.
          {bookingId ? <span className="block">Numero de reservation: #{bookingId}</span> : null}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/" className="btn-soft">
            Retour accueil
          </Link>
          <Link href="/contact" className="btn-main">
            Nous contacter
          </Link>
        </div>
      </section>
    </div>
  );
}
