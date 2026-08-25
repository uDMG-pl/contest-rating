import { SUBMISSIONS, type Submission } from "@/src/data/submissions"

export interface Category {
  id: string
  name: string
}

export type Score = number | null
export type Scores = Record<string, Record<string, Score>>

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

export const STORAGE_KEY = "contest-rating:v3"

const PREVIOUS_STORAGE_KEY = "contest-rating:v2"
const LEGACY_STORAGE_KEY = "contest-rating:v1"
const AUDIENCE_RATING_CATEGORY: Category = {
  id: "audience-rating",
  name: "Ocena widzów",
}

export const DEFAULT_CATEGORIES: readonly Category[] = [
  {
    id: "visual-effect",
    name: "Efekt wizualny",
  },
  { id: "mechanisms", name: "Mechanizmy" },
  {
    id: "theme-connection",
    name: "Powiązanie z tematem",
  },
  { id: "idea", name: "Pomysł" },
  AUDIENCE_RATING_CATEGORY,
] as const

export function normalizeScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }

  return Math.min(10, Math.max(0, Math.round(value * 2) / 2))
}

function createScores(
  categories: readonly Category[],
  savedScores?: unknown,
  zeroIsUnrated = false,
): Scores {
  const source =
    typeof savedScores === "object" && savedScores !== null
      ? (savedScores as Scores)
      : {}

  return Object.fromEntries(
    SUBMISSIONS.map((submission) => [
      submission.id,
      Object.fromEntries(
        categories.map((category) => {
          const savedScore = source[submission.id]?.[category.id]

          return [
            category.id,
            savedScore === null ||
            typeof savedScore !== "number" ||
            !Number.isFinite(savedScore) ||
            (zeroIsUnrated && savedScore === 0)
              ? null
              : normalizeScore(savedScore),
          ]
        }),
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
    const currentSavedValue = window.localStorage.getItem(STORAGE_KEY)
    const previousSavedValue = currentSavedValue
      ? null
      : window.localStorage.getItem(PREVIOUS_STORAGE_KEY)
    const legacySavedValue =
      currentSavedValue || previousSavedValue
        ? null
        : window.localStorage.getItem(LEGACY_STORAGE_KEY)
    const savedValue =
      currentSavedValue ?? previousSavedValue ?? legacySavedValue

    if (!savedValue) {
      return createDefaultContestState()
    }

    const savedState = JSON.parse(savedValue) as Partial<ContestState>
    const savedCategories = parseCategories(savedState.categories)

    if (!savedCategories) {
      return createDefaultContestState()
    }

    const categories =
      legacySavedValue &&
      !savedCategories.some(
        (category) =>
          category.id === AUDIENCE_RATING_CATEGORY.id ||
          category.name.toLocaleLowerCase("pl") ===
            AUDIENCE_RATING_CATEGORY.name.toLocaleLowerCase("pl"),
      )
        ? [...savedCategories, { ...AUDIENCE_RATING_CATEGORY }]
        : savedCategories

    return {
      categories,
      scores: createScores(
        categories,
        savedState.scores,
        Boolean(previousSavedValue || legacySavedValue),
      ),
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
    window.localStorage.removeItem(PREVIOUS_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
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
