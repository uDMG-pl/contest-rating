import { useEffect, useState } from "react"
import { TrophyIcon } from "lucide-react"

import { CategoryManager } from "@/src/components/category-manager"
import { RatingScreen } from "@/src/components/rating-screen"
import { SummaryScreen } from "@/src/components/summary-screen"
import { SUBMISSIONS } from "@/src/data/submissions"
import {
  clearSavedContestState,
  createCategoryId,
  createDefaultContestState,
  loadContestState,
  normalizeScore,
  saveContestState,
} from "@/src/lib/contest-state"

type AppView = "rating" | "summary"

function App() {
  const [contestState, setContestState] = useState(loadContestState)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [view, setView] = useState<AppView>("rating")
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)

  useEffect(() => {
    saveContestState(contestState)
  }, [contestState])

  useEffect(() => {
    if (view !== "rating" || categoryManagerOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest(
            "input, textarea, button, [role='radio'], [role='dialog']",
          ))
      ) {
        return
      }

      if (event.key === "ArrowLeft" && currentIndex > 0) {
        event.preventDefault()
        setCurrentIndex((index) => Math.max(0, index - 1))
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()

        if (currentIndex === SUBMISSIONS.length - 1) {
          setView("summary")
        } else {
          setCurrentIndex((index) => Math.min(SUBMISSIONS.length - 1, index + 1))
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [categoryManagerOpen, currentIndex, view])

  const currentSubmission = SUBMISSIONS[currentIndex]

  function handleScoreChange(categoryId: string, score: number) {
    setContestState((current) => ({
      ...current,
      scores: {
        ...current.scores,
        [currentSubmission.id]: {
          ...current.scores[currentSubmission.id],
          [categoryId]: normalizeScore(score),
        },
      },
    }))
  }

  function handleAddCategory(name: string) {
    const category = { id: createCategoryId(), name }

    setContestState((current) => ({
      categories: [...current.categories, category],
      scores: Object.fromEntries(
        SUBMISSIONS.map((submission) => [
          submission.id,
          {
            ...current.scores[submission.id],
            [category.id]: null,
          },
        ]),
      ),
    }))
  }

  function handleRenameCategory(categoryId: string, name: string) {
    setContestState((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId ? { ...category, name } : category,
      ),
    }))
  }

  function handleDeleteCategory(categoryId: string) {
    setContestState((current) => ({
      categories: current.categories.filter(
        (category) => category.id !== categoryId,
      ),
      scores: Object.fromEntries(
        SUBMISSIONS.map((submission) => [
          submission.id,
          Object.fromEntries(
            Object.entries(current.scores[submission.id] ?? {}).filter(
              ([savedCategoryId]) => savedCategoryId !== categoryId,
            ),
          ),
        ]),
      ),
    }))
  }

  function handleNext() {
    if (currentIndex === SUBMISSIONS.length - 1) {
      setView("summary")
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    setCurrentIndex((index) => Math.min(SUBMISSIONS.length - 1, index + 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handlePrevious() {
    setCurrentIndex((index) => Math.max(0, index - 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleReset() {
    clearSavedContestState()
    setContestState(createDefaultContestState())
    setCurrentIndex(0)
    setView("rating")
    setCategoryManagerOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-svh bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrophyIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">Ocena konkursu</p>
              <p className="truncate text-xs text-muted-foreground">
                Panel jury
              </p>
            </div>
          </div>
          <CategoryManager
            categories={contestState.categories}
            open={categoryManagerOpen}
            onOpenChange={setCategoryManagerOpen}
            onAdd={handleAddCategory}
            onRename={handleRenameCategory}
            onDelete={handleDeleteCategory}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        {view === "rating" ? (
          <RatingScreen
            submission={currentSubmission}
            currentIndex={currentIndex}
            submissionCount={SUBMISSIONS.length}
            categories={contestState.categories}
            scores={contestState.scores}
            onScoreChange={handleScoreChange}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onOpenCategories={() => setCategoryManagerOpen(true)}
          />
        ) : (
          <SummaryScreen
            categories={contestState.categories}
            scores={contestState.scores}
            onBack={() => setView("rating")}
            onReset={handleReset}
            onOpenCategories={() => setCategoryManagerOpen(true)}
          />
        )}
      </main>
    </div>
  )
}

export default App
