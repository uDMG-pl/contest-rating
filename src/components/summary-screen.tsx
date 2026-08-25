import {
  ArrowLeftIcon,
  RotateCcwIcon,
  Settings2Icon,
  TagsIcon,
  TrophyIcon,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createRanking,
  type Category,
  type Scores,
} from "@/src/lib/contest-state"

interface SummaryScreenProps {
  categories: readonly Category[]
  scores: Scores
  onBack: () => void
  onReset: () => void
  onOpenCategories: () => void
}

const placementBadgeVariants = ["gold", "silver", "bronze"] as const

export function SummaryScreen({
  categories,
  scores,
  onBack,
  onReset,
  onOpenCategories,
}: SummaryScreenProps) {
  const ranking = createRanking(categories, scores)
  const maximum = categories.length * 10

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <Badge className="w-fit" variant="outline">
          <TrophyIcon data-icon="inline-start" />
          Podsumowanie
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ranking zgłoszeń
          </h1>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Klasyfikacja końcowa</CardTitle>
          <CardDescription>
            Wyniki wszystkich zgłoszeń z rozbiciem na kategorie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <ScrollArea className="w-full [&_[data-slot=table-container]]:overflow-visible">
              <Table className="min-w-max">
                <TableCaption>
                  Maksymalny wynik jednego zgłoszenia: {maximum} punktów.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Miejsce</TableHead>
                    <TableHead>Zgłoszenie</TableHead>
                    <TableHead className="text-right">Wynik</TableHead>
                    <TableHead className="text-right">Procent</TableHead>
                    {categories.map((category) => (
                      <TableHead className="text-center" key={category.id}>
                        {category.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((row, index) => (
                    <TableRow key={row.submission.id}>
                      <TableCell>
                        <Badge
                          variant={placementBadgeVariants[index] ?? "outline"}
                        >
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-64 whitespace-normal">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">
                            {row.submission.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {row.submission.minecraft}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {row.total}/{row.maximum}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.percentage}%
                      </TableCell>
                      {categories.map((category) => (
                        <TableCell
                          className="text-center tabular-nums"
                          key={category.id}
                        >
                          {scores[row.submission.id]?.[category.id] ?? 0}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TagsIcon />
                </EmptyMedia>
                <EmptyTitle>Brak kategorii do podsumowania</EmptyTitle>
                <EmptyDescription>
                  Dodaj kategorię, aby utworzyć punktowany ranking zgłoszeń.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={onOpenCategories}>
                  <Settings2Icon data-icon="inline-start" />
                  Zarządzaj kategoriami
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeftIcon data-icon="inline-start" />
            Wróć do oceniania
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" />}>
              <RotateCcwIcon data-icon="inline-start" />
              <span className="hidden sm:inline">Wyczyść oceny</span>
              <span className="sm:hidden">Wyczyść</span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia>
                  <RotateCcwIcon />
                </AlertDialogMedia>
                <AlertDialogTitle>Wyczyścić wszystkie oceny?</AlertDialogTitle>
                <AlertDialogDescription>
                  Przywrócimy domyślne kategorie i ustawimy wszystkie wyniki na
                  0. Tej operacji nie można cofnąć.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onReset}>
                  Wyczyść wszystko
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  )
}
