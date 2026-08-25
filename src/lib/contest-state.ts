import { SUBMISSIONS, type Submission } from "@/src/data/submissions"

export interface Category {
  id: string
  name: string
}

export type Scores = Record<string, Record<string, number>>

export interface ContestState {
  categories: Category[]
  scores: Scores
}

export interface RankingRow {
  submission: Submission
  sourceIndex: number
  total: number
  maximum: number
  percentage: number
}

export const STORAGE_KEY = "contest-rating:v1"

export const DEFAULT_CATEGORIES: readonly Category[] = [
  {
    id: "visual-effect",
    name: "Efekt wizualny (w tym wielkość budowli)",
  },
  { id: "mechanisms", name: "Mechanizmy" },
  {
    id: "theme-connection",
    name: "Powiązanie z tematem 1 albo 2",
  },
  { id: "idea", name: "Pomysł" },
] as const

function clampScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }

  return Math.min(10, Math.max(0, Math.round(value)))
}

function createScores(
  categories: readonly Category[],
  savedScores?: unknown,
): Scores {
  const source =
    typeof savedScores === "object" && savedScores !== null
      ? (savedScores as Scores)
      : {}

  return Object.fromEntries(
    SUBMISSIONS.map((submission) => [
      submission.id,
      Object.fromEntries(
        categories.map((category) => [
          category.id,
          clampScore(source[submission.id]?.[category.id]),
        ]),
      ),
    ]),
  )
}

function parseCategories(value: unknown): Category[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const ids = new Set<string>()
  const categories: Category[] = []

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return null
    }

    const { id, name } = item as Partial<Category>
    const normalizedName = typeof name === "string" ? name.trim() : ""

    if (typeof id !== "string" || !id || !normalizedName || ids.has(id)) {
      return null
    }

    ids.add(id)
    categories.push({ id, name: normalizedName })
  }

  return categories
}

export function createDefaultContestState(): ContestState {
  const categories = DEFAULT_CATEGORIES.map((category) => ({ ...category }))

  return {
    categories,
    scores: createScores(categories),
  }
}

export function loadContestState(): ContestState {
  try {
    const savedValue = window.localStorage.getItem(STORAGE_KEY)

    if (!savedValue) {
      return createDefaultContestState()
    }

    const savedState = JSON.parse(savedValue) as Partial<ContestState>
    const categories = parseCategories(savedState.categories)

    if (!categories) {
      return createDefaultContestState()
    }

    return {
      categories,
      scores: createScores(categories, savedState.scores),
    }
  } catch {
    return createDefaultContestState()
  }
}

export function saveContestState(state: ContestState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The app remains usable when storage is disabled or full.
  }
}

export function clearSavedContestState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // The in-memory reset still succeeds when storage is unavailable.
  }
}

export function getSubmissionTotal(
  submissionId: string,
  categories: readonly Category[],
  scores: Scores,
) {
  return categories.reduce(
    (total, category) => total + (scores[submissionId]?.[category.id] ?? 0),
    0,
  )
}

export function createRanking(
  categories: readonly Category[],
  scores: Scores,
): RankingRow[] {
  const maximum = categories.length * 10

  return SUBMISSIONS.map((submission, sourceIndex) => {
    const total = getSubmissionTotal(submission.id, categories, scores)

    return {
      submission,
      sourceIndex,
      total,
      maximum,
      percentage: maximum === 0 ? 0 : Math.round((total / maximum) * 100),
    }
  }).toSorted(
    (first, second) =>
      second.total - first.total || first.sourceIndex - second.sourceIndex,
  )
}

export function createCategoryId() {
  return `category-${crypto.randomUUID()}`
}
