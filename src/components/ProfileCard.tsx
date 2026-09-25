import Image from "next/image";
import Link from "next/link";
import type { ProfileSummary } from "@/server/services/catalogService";
import { Avatar } from "./Avatar";

/** Posição de cada pôster no leque: parado e com o mouse em cima. */
const fan = [
  "-rotate-[5deg] group-hover:-rotate-[11deg] group-hover:-translate-x-2.5",
  "group-hover:-translate-y-1.5",
  "rotate-[5deg] group-hover:rotate-[11deg] group-hover:translate-x-2.5",
];

export function ProfileCard({ profile, note }: { profile: ProfileSummary; note?: string }) {
  return (
    <Link
      href={`/perfil/${profile.id}`}
      className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-4 outline-none transition-[transform,box-shadow,border-color] duration-500 ease-spring hover:-translate-y-1.5 hover:border-accent/50 hover:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.35)] focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.985] sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="transition-transform duration-500 ease-spring group-hover:scale-110">
          <Avatar initials={profile.initials} hue={profile.hue} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold transition-colors duration-200 group-hover:text-accent">{profile.name}</p>
          <p className="truncate text-sm text-muted">Curte {profile.taste}</p>
        </div>
      </div>
      {profile.posters.length > 0 && (
        <div className="mt-4 flex pl-3">
          {profile.posters.map((url, i) => (
            <Image
              key={url}
              src={url}
              alt=""
              width={56}
              height={84}
              className={`-ml-3 rounded-md object-cover shadow-md ring-2 ring-surface transition-transform duration-500 ease-spring ${fan[i] ?? ""}`}
            />
          ))}
        </div>
      )}
      <p className="mt-auto pt-4 text-xs text-muted">{note ?? `${profile.ratedCount} filmes avaliados`}</p>
    </Link>
  );
}
