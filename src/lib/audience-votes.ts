import type { ChatVote } from "./kick-chat.ts"

export const AUDIENCE_CATEGORY_ID = "audience-rating"
export const AUDIENCE_STORAGE_KEY = "contest-rating:audience:v1"
export type AudienceVotes = Record<string, Record<string, ChatVote>>
type VoteStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

export function getAudienceAverage(votes: Record<string, ChatVote> = {}) {
  const values = Object.values(votes)
  return {
    count: values.length,
    average: values.length ? values.reduce((sum, vote) => sum + vote.score, 0) / values.length : null,
  }
}

export function loadAudienceVotes(storage: VoteStorage | undefined, ids: readonly string[]): AudienceVotes {
  try {
    const saved: unknown = JSON.parse(storage?.getItem(AUDIENCE_STORAGE_KEY) ?? "null")
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {}
    const result: AudienceVotes = {}
    for (const id of ids) {
      const votes: unknown = (saved as AudienceVotes)[id]
      if (!votes || typeof votes !== "object" || Array.isArray(votes)) continue
      const valid: Record<string, ChatVote> = {}
      for (const [userId, value] of Object.entries(votes)) {
        if (!value || typeof value !== "object") continue
        const vote = value as ChatVote
        if (
          /^[1-9]\d*$/.test(userId) && vote.userId === userId &&
          typeof vote.score === "number" && Number.isFinite(vote.score) && vote.score >= 0 && vote.score <= 10 &&
          typeof vote.messageId === "string" && vote.messageId &&
          typeof vote.timestamp === "number" && Number.isFinite(vote.timestamp)
        ) valid[userId] = vote
      }
      result[id] = valid
    }
    return result
  } catch {
    return {}
  }
}

// Owns the active time window so queued callbacks cannot vote for an old screen.
export class AudienceVoteStore {
  private votes: AudienceVotes
  private active: { id: string; since: number } | null = null
  private listeners = new Set<() => void>()
  private storage: VoteStorage | undefined
  private saveTimer: ReturnType<typeof setTimeout> | undefined
  private dirty = false
  private seenMessages = new Set<string>()

  constructor(ids: readonly string[], storage?: VoteStorage) {
    this.storage = storage
    this.votes = loadAudienceVotes(storage, ids)
  }

  getSnapshot = () => this.votes
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  activate(id: string | null, since = Date.now()) {
    this.active = id === null ? null : { id, since }
  }

  record = (vote: ChatVote) => {
    if (!this.active || vote.timestamp < this.active.since) return
    if (this.seenMessages.has(vote.messageId)) return
    this.seenMessages.add(vote.messageId)
    // Bound transport deduplication memory; each viewer's latest ID is also saved.
    if (this.seenMessages.size > 10_000) {
      this.seenMessages.delete(this.seenMessages.values().next().value!)
    }
    const id = this.active.id
    const previous = this.votes[id]?.[vote.userId]
    if (previous && (previous.messageId === vote.messageId || previous.timestamp > vote.timestamp)) return
    // UUIDs do not order messages; equal timestamps use delivery order.
    this.votes = { ...this.votes, [id]: { ...this.votes[id], [vote.userId]: vote } }
    this.dirty = true
    if (this.saveTimer === undefined) this.saveTimer = setTimeout(this.flush, 500)
    this.listeners.forEach((listener) => listener())
  }

  flush = () => {
    clearTimeout(this.saveTimer)
    this.saveTimer = undefined
    if (!this.dirty) return
    try {
      this.storage?.setItem(AUDIENCE_STORAGE_KEY, JSON.stringify(this.votes))
      this.dirty = false
    } catch { /* Keep collecting in memory when storage is unavailable. */ }
  }

  reset = () => {
    clearTimeout(this.saveTimer)
    this.saveTimer = undefined
    this.dirty = false
    this.votes = {}
    this.seenMessages.clear()
    if (this.active) this.active = { id: this.active.id, since: Date.now() }
    try {
      this.storage?.removeItem(AUDIENCE_STORAGE_KEY)
    } catch { /* The in-memory reset still succeeds. */ }
    this.listeners.forEach((listener) => listener())
  }
}
