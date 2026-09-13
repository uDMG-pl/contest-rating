import assert from "node:assert/strict"
import { test } from "node:test"
import { connectKickChat, KICK_CHATROOM_ID, KICK_SOCKET_URL, type ChatStatus, type ChatVote } from "../src/lib/kick-chat.ts"

const channel = `chatrooms.${KICK_CHATROOM_ID}.v2`
class FakeSocket {
  readyState = 1
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  sent: { event: string; data: unknown }[] = []
  closed = false
  send(value: string) { this.sent.push(JSON.parse(value)) }
  close() { this.closed = true }
  emit(event: string, data: unknown = {}, frameChannel = channel) {
    this.onmessage?.({ data: JSON.stringify({ event, channel: frameChannel, data: JSON.stringify(data) }) })
  }
  establish() { this.emit("pusher:connection_established", { activity_timeout: 120 }) }
  subscribe() { this.emit("pusher_internal:subscription_succeeded") }
}

function setup() {
  const sockets: FakeSocket[] = []
  const statuses: ChatStatus[] = []
  const votes: ChatVote[] = []
  const stop = connectKickChat({
    onStatus: (status) => statuses.push(status),
    onVote: (vote) => votes.push(vote),
    createSocket: (url) => {
      assert.equal(url, KICK_SOCKET_URL)
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket as unknown as WebSocket
    },
  })
  return { sockets, statuses, votes, stop }
}

test("waits for subscription acknowledgment and filters chat events by channel", () => {
  const { sockets: [socket], statuses, votes, stop } = setup()
  const payload = { id: "1", content: "8,5", created_at: "2026-09-12T12:00:00Z", sender: { id: 1 } }
  socket.establish()
  assert.deepEqual(socket.sent, [{ event: "pusher:subscribe", data: { auth: "", channel } }])
  socket.emit("App\\Events\\ChatMessageEvent", payload)
  assert.equal(votes.length, 0)
  assert.deepEqual(statuses, ["connecting"])
  socket.subscribe()
  socket.emit("App\\Events\\ChatMessageEvent", payload, "chatrooms.2.v2")
  socket.emit("unrelated", payload)
  socket.onmessage?.({ data: "broken JSON" })
  socket.emit("App\\Events\\ChatMessageEvent", payload)
  assert.deepEqual(statuses, ["connecting", "connected"])
  assert.equal(votes.length, 1)
  assert.equal(votes[0].score, 8.5)
  stop()
  assert.equal(socket.closed, true)
  assert.equal(socket.onmessage, null)
})

test("heartbeats answer server ping and reconnect when pong is missing", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  const { sockets, statuses, stop } = setup()
  sockets[0].establish()
  sockets[0].subscribe()
  sockets[0].emit("pusher:ping")
  assert.equal(sockets[0].sent.at(-1)?.event, "pusher:pong")
  t.mock.timers.tick(120_000)
  assert.equal(sockets[0].sent.at(-1)?.event, "pusher:ping")
  t.mock.timers.tick(10_000)
  assert.equal(statuses.at(-1), "reconnecting")
  assert.equal(sockets[0].closed, true)
  t.mock.timers.tick(1000)
  assert.equal(sockets.length, 2)
  stop()
})

test("pong prevents timeout and resumes heartbeat", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  const { sockets, statuses, stop } = setup()
  sockets[0].establish()
  sockets[0].subscribe()
  t.mock.timers.tick(120_000)
  sockets[0].emit("pusher:pong")
  t.mock.timers.tick(10_000)
  assert.equal(statuses.at(-1), "connected")
  assert.equal(sockets.length, 1)
  stop()
})

test("reconnection backs off to 30 seconds, resets on success and cleans up", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  const { sockets, stop } = setup()
  for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
    const count = sockets.length
    sockets.at(-1)!.onerror?.()
    t.mock.timers.tick(delay - 1)
    assert.equal(sockets.length, count)
    t.mock.timers.tick(1)
    assert.equal(sockets.length, count + 1)
  }
  sockets.at(-1)!.establish()
  sockets.at(-1)!.subscribe()
  sockets.at(-1)!.onclose?.()
  const count = sockets.length
  t.mock.timers.tick(1000)
  assert.equal(sockets.length, count + 1)
  stop()
  t.mock.timers.tick(500_000)
  assert.equal(sockets.length, count + 1)
  assert.ok(sockets.every((socket) => socket.closed))
})

test("subscription timeout and protocol errors reconnect without announcing connected", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  const { sockets, statuses, stop } = setup()
  sockets[0].establish()
  t.mock.timers.tick(10_000)
  assert.equal(statuses.at(-1), "reconnecting")
  t.mock.timers.tick(1000)
  sockets[1].emit("pusher:error", { code: 4001 })
  assert.ok(!statuses.includes("connected"))
  stop()
  t.mock.timers.tick(30_000)
  assert.equal(sockets.length, 2)
})

test("socket construction failure can be cancelled before retry", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  let attempts = 0
  const stop = connectKickChat({ onVote() {}, onStatus() {}, createSocket() { attempts++; throw new Error("offline") } })
  assert.equal(attempts, 1)
  stop()
  t.mock.timers.tick(30_000)
  assert.equal(attempts, 1)
})
