import { redirect } from "next/navigation";

/** Destino do formulário "abrir perfil pelo número" (/perfil?id=5 → /perfil/5). */
export default async function OpenProfile({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const n = Number(id);
  redirect(Number.isInteger(n) && n > 0 ? `/perfil/${n}` : "/#perfis");
}
