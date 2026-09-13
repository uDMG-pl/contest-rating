import assert from "node:assert/strict"
import { test } from "node:test"
import { AudienceVoteStore, AUDIENCE_STORAGE_KEY, getAudienceAverage, loadAudienceVotes } from "../src/lib/audience-votes.ts"
import { KICK_CHATROOM_ID, parseAudienceScore, parseChatVote, type ChatVote } from "../src/lib/kick-chat.ts"

const vote = (userId = "1", score = 8, timestamp = 1000, messageId = `${userId}-${timestamp}`): ChatVote =>
  ({ userId, score, timestamp, messageId })

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

test("accepts only scores from 0 to 10 in half-point increments", () => {
  for (const [text, score] of [["0", 0], ["10", 10], [" 8 ", 8], ["8.5", 8.5], ["8,5", 8.5], ["1.5", 1.5], ["0,5", 0.5], ["9.50", 9.5], ["10,00", 10]] as const) {
    assert.equal(parseAudienceScore(text), score)
  }
  for (const text of ["7.83", "1.25", "0.1", "9.99", "", " ", "11", "-1", "10.01", "daję 8", "8/10", "8 9", "1e1", "0xA", "Infinity", "8,5.1", "8\n9", null, 8, {}]) {
    assert.equal(parseAudienceScore(text), null, String(text))
  }
})

test("validates native Kick payload and its JSON-encoded form", () => {
  const payload = { id: "msg", content: "7,5", created_at: "2026-09-12T10:00:00.123Z", sender: { id: 7 }, chatroom_id: KICK_CHATROOM_ID }
  const expected = vote("7", 7.5, Date.parse(payload.created_at), "msg")
  assert.deepEqual(parseChatVote(payload), expected)
  assert.deepEqual(parseChatVote(JSON.stringify(payload)), expected)
  for (const bad of ["{", null, [], { ...payload, sender: null }, { ...payload, sender: { id: 0 } }, { ...payload, created_at: "invalid" }, { ...payload, id: "" }, { ...payload, chatroom_id: 2 }, { ...payload, content: "hello" }]) {
    assert.equal(parseChatVote(bad), null)
  }
})

test("invalid fractions cannot replace valid votes or return from storage", () => {
  const storage = memoryStorage()
  const store = new AudienceVoteStore(["a"], storage)
  store.activate("a", 0)
  store.record(vote("1", 1.5))
  store.record(vote("1", 1.25, 2000))
  store.record(vote("2", 7.83))
  assert.deepEqual(getAudienceAverage(store.getSnapshot().a), { average: 1.5, count: 1 })
  store.flush()
  storage.setItem(AUDIENCE_STORAGE_KEY, JSON.stringify({
    a: { "1": vote("1", 1.5), "2": vote("2", 7.83), "3": vote("3", 0.5) },
  }))
  assert.deepEqual(getAudienceAverage(loadAudienceVotes(storage, ["a"]).a), { average: 1, count: 2 })
})

test("one latest vote per viewer; ignores duplicates and out-of-order updates", () => {
  const store = new AudienceVoteStore(["a"])
  store.activate("a", 0)
  store.record(vote("1", 8, 1000))
  store.record(vote("2", 10, 1000))
  assert.deepEqual(getAudienceAverage(store.getSnapshot().a), { average: 9, count: 2 })
  store.record(vote("1", 7.5, 2000))
  store.record(vote("1", 1, 1500))
  store.record(vote("1", 7.5, 2000))
  assert.deepEqual(getAudienceAverage(store.getSnapshot().a), { average: 8.75, count: 2 })
  store.record(vote("1", 6, 2000, "second-at-same-time"))
  store.record(vote("1", 7.5, 2000))
  assert.equal(store.getSnapshot().a["1"].score, 6)
  store.flush()
})

test("switching submissions separates votes, filters old deliveries and continues on return", () => {
  const store = new AudienceVoteStore(["a", "b"])
  store.activate("a", 1000)
  store.record(vote("1", 8, 999))
  assert.deepEqual(getAudienceAverage(store.getSnapshot().a), { average: null, count: 0 })
  store.record(vote("1", 8, 1100))
  store.activate("b", 2000)
  store.record(vote("2", 3, 1999))
  store.record(vote("1", 4, 2100))
  assert.equal(store.getSnapshot().a["1"].score, 8)
  assert.deepEqual(getAudienceAverage(store.getSnapshot().b), { average: 4, count: 1 })
  store.activate("a", 3000)
  store.record(vote("2", 10, 3100))
  assert.deepEqual(getAudienceAverage(store.getSnapshot().a), { average: 9, count: 2 })
  store.flush()
})

test("summary or missing category pauses collection and reopening ignores messages from pause", () => {
  const store = new AudienceVoteStore(["a"])
  store.activate("a", 0)
  store.record(vote())
  store.activate(null)
  store.record(vote("2", 2, 1500))
  store.activate("a", 2000)
  store.record(vote("2", 2, 1500))
  assert.deepEqual(getAudienceAverage(store.getSnapshot().a), { average: 8, count: 1 })
  store.flush()
})

test("saves independently of manual scores, restores votes and deduplicates latest persisted message", () => {
  const storage = memoryStorage()
  storage.setItem("contest-rating:v3", '{"scores":{"a":{"audience-rating":5}}}')
  const store = new AudienceVoteStore(["a"], storage)
  store.activate("a", 0)
  store.record(vote())
  store.flush()
  const restored = new AudienceVoteStore(["a"], storage)
  restored.activate("a", 0)
  const before = restored.getSnapshot()
  restored.record(vote())
  assert.equal(restored.getSnapshot(), before)
  assert.deepEqual(getAudienceAverage(before.a), { average: 8, count: 1 })
  assert.equal(storage.getItem("contest-rating:v3"), '{"scores":{"a":{"audience-rating":5}}}')
})

test("reset clears persisted votes and pending save, and establishes a new time boundary", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 3000 })
  const storage = memoryStorage()
  const store = new AudienceVoteStore(["a"], storage)
  store.activate("a", 0)
  store.record(vote())
  store.reset()
  t.mock.timers.tick(1000)
  store.record(vote("2", 1, 2000))
  assert.deepEqual(store.getSnapshot(), {})
  assert.equal(storage.getItem(AUDIENCE_STORAGE_KEY), null)
  store.record(vote("2", 9, 4000))
  t.mock.timers.tick(500)
  assert.equal(loadAudienceVotes(storage, ["a"]).a["2"].score, 9)
})

test("corrupt storage is ignored; only valid votes and known submissions are restored", () => {
  const storage = memoryStorage()
  storage.setItem(AUDIENCE_STORAGE_KEY, "{")
  assert.deepEqual(loadAudienceVotes(storage, ["a"]), {})
  storage.setItem(AUDIENCE_STORAGE_KEY, JSON.stringify({ a: { "1": vote(), "2": vote("2", 99), "3": { ...vote("3"), timestamp: null } }, unknown: { "1": vote() } }))
  assert.deepEqual(loadAudienceVotes(storage, ["a"]), { a: { "1": vote() } })
})

test("blocked storage does not prevent collecting, flushing or resetting votes", () => {
  const fail = () => { throw new Error("Storage disabled") }
  const store = new AudienceVoteStore(["a"], { getItem: fail, setItem: fail, removeItem: fail })
  store.activate("a", 0)
  store.record(vote())
  store.flush()
  assert.equal(getAudienceAverage(store.getSnapshot().a).average, 8)
  store.reset()
  assert.deepEqual(store.getSnapshot(), {})
})
