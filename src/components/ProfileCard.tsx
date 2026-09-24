import Image from "next/image";
import Link from "next/link";
import type { ProfileSummary } from "@/server/services/catalogService";
import { Avatar } from "./Avatar";

export function ProfileCard({ profile, note }: { profile: ProfileSummary; note?: string }) {
  return (
    <Link
      href={`/perfil/${profile.id}`}
      className="group flex flex-col rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <Avatar initials={profile.initials} hue={profile.hue} />
        <div className="min-w-0">
          <p className="font-semibold group-hover:text-accent">{profile.name}</p>
          <p className="truncate text-sm text-muted">Curte {profile.taste}</p>
        </div>
      </div>
      {profile.posters.length > 0 && (
        <div className="mt-4 flex -space-x-3">
          {profile.posters.map((url, i) => (
            <Image
              key={url}
              src={url}
              alt=""
              width={56}
              height={84}
              className="rounded-md object-cover shadow ring-2 ring-surface"
              style={{ transform: `rotate(${(i - 1) * 4}deg)` }}
            />
          ))}
        </div>
      )}
      <p className="mt-auto pt-4 text-xs text-muted">{note ?? `${profile.ratedCount} filmes avaliados`}</p>
    </Link>
  );
}
