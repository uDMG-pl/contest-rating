// Browser-only integration fixture, excluded from the production entry point.
// Isolate App's localStorage from the user's real scores, including on reload.
const testStorageKey = "contest-rating:browser-smoke"
const values: Record<string, string> = JSON.parse(sessionStorage.getItem(testStorageKey) ?? "{}")
const persist = () => sessionStorage.setItem(testStorageKey, JSON.stringify(values))
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => { values[key] = value; persist() },
    removeItem: (key: string) => { delete values[key]; persist() },
  },
})

class BrowserSocket {
  static latest: BrowserSocket
  readyState = 1
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null

  constructor() {
    BrowserSocket.latest = this
    queueMicrotask(() => this.emit("pusher:connection_established", { activity_timeout: 120 }))
  }

  emit(event: string, data: unknown = {}) {
    this.onmessage?.({ data: JSON.stringify({ event, channel: "chatrooms.16408151.v2", data: JSON.stringify(data) }) })
  }

  send(raw: string) {
    const { event } = JSON.parse(raw)
    if (event === "pusher:subscribe") queueMicrotask(() => this.emit("pusher_internal:subscription_succeeded"))
    if (event === "pusher:ping") queueMicrotask(() => this.emit("pusher:pong"))
  }

  close() { this.readyState = 3 }
}
Object.defineProperty(window, "WebSocket", { value: BrowserSocket })

function vote(id: number, content: string) {
  BrowserSocket.latest.emit("App\\Events\\ChatMessageEvent", {
    id: crypto.randomUUID(), content, sender: { id },
    created_at: new Date().toISOString(), chatroom_id: 16408151,
  })
}

document.getElementById("votes")!.onclick = () => { vote(1, "8"); vote(2, "10") }
document.getElementById("correction")!.onclick = () => vote(1, "6")
document.getElementById("disconnect")!.onclick = () => BrowserSocket.latest.onclose?.()
await import("../src/main.tsx")
