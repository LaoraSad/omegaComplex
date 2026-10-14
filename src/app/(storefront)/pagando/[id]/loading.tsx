// OPT-3: la redirección a Stripe se resuelve en el servidor; esto cubre la espera.
export default function PagandoLoading() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center" aria-busy="true" aria-label="Abriendo pasarela">
      <p className="text-xl font-black">Abriendo la pasarela de pago…</p>
      <p className="mt-2 text-sm text-white/60">No cierres esta ventana.</p>
    </div>
  );
}
