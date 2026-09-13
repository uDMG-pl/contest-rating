import { Badge } from "@/components/ui/badge"
import { KICK_CHANNEL_URL, type ChatStatus } from "@/src/lib/kick-chat"

const numberFormat = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 })
const statusLabels: Record<ChatStatus, string> = {
  connecting: "Łączenie z czatem…",
  connected: "Połączono z czatem",
  reconnecting: "Ponowne łączenie…",
  paused: "Zbieranie wstrzymane",
}

export interface AudienceRatingHintProps {
  average: number | null
  count: number
  status: ChatStatus
}

export function AudienceRatingHint({ average, count, status }: AudienceRatingHintProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium tabular-nums">
          Średnia z czatu: {average === null ? "Brak głosów" : `${numberFormat.format(average)}/10`}
          {count > 0 ? ` · Głosujących: ${numberFormat.format(count)}` : ""}
        </p>
        <Badge variant={status === "connected" ? "outline" : "secondary"} role="status">
          {statusLabels[status]}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        <a href={KICK_CHANNEL_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          kick.com/dmgpoland
        </a>
        {" · Wpisz na czacie ocenę 0–10 co 0,5, np. 1.5 lub 8,5. Inne ułamki są pomijane. Liczy się ostatnia poprawna ocena każdego widza. Ocenę do rankingu wybierasz ręcznie poniżej."}
      </p>
      {status === "reconnecting" ? (
        <p className="text-xs text-muted-foreground">
          Zachowano dotychczasowe głosy. Wiadomości z czasu przerwy nie zostaną doliczone.
        </p>
      ) : null}
    </div>
  )
}
