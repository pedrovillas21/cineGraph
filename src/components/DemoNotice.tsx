/** Aviso discreto quando o banco não respondeu e a tela usa os dados de exemplo. */
export function DemoNotice({ dbError }: { dbError?: string }) {
  if (!dbError) return null;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
      <p className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-2 text-sm">
        Estamos mostrando um catálogo de exemplo porque o banco de filmes não respondeu agora. Tente de novo em
        instantes.
      </p>
    </div>
  );
}
