import { Fragment } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Gamepad2Icon,
  MapPinnedIcon,
  RadioIcon,
  Settings2Icon,
  TagsIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
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
import { Field, FieldGroup, FieldTitle } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import type { Submission } from "@/src/data/submissions"
import {
  getSubmissionTotal,
  type Category,
  type Scores,
} from "@/src/lib/contest-state"
import { cn } from "@/lib/utils"

interface RatingScreenProps {
  submission: Submission
  currentIndex: number
  submissionCount: number
  categories: readonly Category[]
  scores: Scores
  onScoreChange: (categoryId: string, score: number) => void
  onPrevious: () => void
  onNext: () => void
  onOpenCategories: () => void
}

interface SubmissionDetailProps {
  icon: LucideIcon
  label: string
  value: string
  monospace?: boolean
}

function SubmissionDetail({
  icon: Icon,
  label,
  value,
  monospace = false,
}: SubmissionDetailProps) {
  return (
    <div className="grid min-w-0 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
      <Icon className="row-span-2 mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <dt className="min-w-0 text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 truncate", monospace && "font-mono")}>
        {value}
      </dd>
    </div>
  )
}

export function RatingScreen({
  submission,
  currentIndex,
  submissionCount,
  categories,
  scores,
  onScoreChange,
  onPrevious,
  onNext,
  onOpenCategories,
}: RatingScreenProps) {
  const submissionScores = scores[submission.id] ?? {}
  const currentTotal = getSubmissionTotal(submission.id, categories, scores)
  const maximum = categories.length * 10
  const isLastSubmission = currentIndex === submissionCount - 1
  const progress = ((currentIndex + 1) / submissionCount) * 100
  const coordinates = submission.coordinates?.join(" ") ?? "Do uzupełnienia"

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-label="Postęp oceniania">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="outline">
            Zgłoszenie {currentIndex + 1} z {submissionCount}
          </Badge>
          <span className="text-sm tabular-nums text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress
          value={progress}
          aria-label={`Postęp: ${Math.round(progress)}%`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{submission.name}</CardTitle>
          <CardDescription>Dane zgłoszenia konkursowego</CardDescription>
          <CardAction>
            <Badge variant={submission.placeholder ? "secondary" : "default"}>
              {submission.placeholder ? "Do uzupełnienia" : "Gotowe do oceny"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-3">
            <SubmissionDetail
              icon={RadioIcon}
              label="Kick"
              value={submission.kick}
            />
            <SubmissionDetail
              icon={Gamepad2Icon}
              label="Minecraft"
              value={submission.minecraft}
            />
            <SubmissionDetail
              icon={MapPinnedIcon}
              label="Koordynaty"
              value={coordinates}
              monospace
            />
          </dl>
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <span className="text-muted-foreground">Aktualny wynik</span>
          <span className="font-medium tabular-nums">
            {currentTotal} / {maximum}
          </span>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Oceny</CardTitle>
          <CardDescription>
            Przesuń suwak lub użyj klawiszy strzałek. Każda kategoria ma
            zakres od 0 do 10.
          </CardDescription>
          <CardAction>
            <Badge variant="secondary">
              {currentTotal}/{maximum}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <FieldGroup>
              {categories.map((category, index) => {
                const score = submissionScores[category.id] ?? 0
                const labelId = `score-${submission.id}-${category.id}`

                return (
                  <Fragment key={category.id}>
                    {index > 0 ? <Separator /> : null}
                    <Field>
                      <div className="flex items-start justify-between gap-4">
                        <FieldTitle id={labelId}>{category.name}</FieldTitle>
                        <Badge variant="outline">{score}/10</Badge>
                      </div>
                      <Slider
                        value={[score]}
                        min={0}
                        max={10}
                        step={1}
                        aria-labelledby={labelId}
                        onValueChange={(value) => {
                          const nextScore = Array.isArray(value)
                            ? (value[0] ?? 0)
                            : value
                          onScoreChange(category.id, nextScore)
                        }}
                      />
                      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                        <span>0</span>
                        <span>10</span>
                      </div>
                    </Field>
                  </Fragment>
                )
              })}
            </FieldGroup>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TagsIcon />
                </EmptyMedia>
                <EmptyTitle>Dodaj kategorię oceniania</EmptyTitle>
                <EmptyDescription>
                  Potrzebujesz co najmniej jednej kategorii, aby przyznawać
                  punkty.
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
        <CardFooter>
          <nav
            className="flex w-full items-center justify-between gap-3"
            aria-label="Nawigacja między zgłoszeniami"
          >
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={currentIndex === 0}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Wstecz
            </Button>
            <span className="hidden text-xs text-muted-foreground md:inline">
              Skróty: ← i →
            </span>
            <Button onClick={onNext}>
              {isLastSubmission ? "Podsumowanie" : "Dalej"}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </nav>
        </CardFooter>
      </Card>
    </div>
  )
}
