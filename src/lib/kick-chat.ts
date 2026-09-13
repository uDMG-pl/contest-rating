// Kick's public chat transport is unofficial. Keep its configuration isolated.
export const KICK_CHANNEL_URL = "https://kick.com/dmgpoland"
export const KICK_CHATROOM_ID = 16408151
export const KICK_SOCKET_URL =
  "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false"
const CHAT_CHANNEL = `chatrooms.${KICK_CHATROOM_ID}.v2`
const CHAT_EVENT = "App\\Events\\ChatMessageEvent"

export type ChatStatus = "connecting" | "connected" | "reconnecting" | "paused"

export interface ChatVote {
  userId: string
  score: number
  messageId: string
  timestamp: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseAudienceScore(content: unknown): number | null {
  if (typeof content !== "string") return null
  const value = content.trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(value)) return null
  const score = Number(value.replace(",", "."))
  return Number.isFinite(score) && score >= 0 && score <= 10 ? score : null
}

function parseData(data: unknown): unknown {
  return typeof data === "string" ? JSON.parse(data) : data
}

export function parseChatVote(data: unknown): ChatVote | null {
  try {
    const message = parseData(data)
    if (!isRecord(message) || !isRecord(message.sender)) return null
    const score = parseAudienceScore(message.content)
    const userId = message.sender.id
    if (
      score === null ||
      typeof userId !== "number" || !Number.isSafeInteger(userId) || userId <= 0 ||
      typeof message.id !== "string" || !message.id ||
      typeof message.created_at !== "string" ||
      (message.chatroom_id !== undefined && message.chatroom_id !== KICK_CHATROOM_ID)
    ) return null
    const timestamp = Date.parse(message.created_at)
    if (!Number.isFinite(timestamp)) return null
    return { userId: String(userId), score, messageId: message.id, timestamp }
  } catch {
    return null
  }
}

interface ChatOptions {
  onVote: (vote: ChatVote) => void
  onStatus: (status: ChatStatus) => void
  createSocket?: (url: string) => WebSocket
}

export function connectKickChat({
  onVote,
  onStatus,
  createSocket = (url) => new WebSocket(url),
}: ChatOptions): () => void {
  let stopped = false
  let socket: WebSocket | null = null
  let retryDelay = 1000
  let subscribed = false
  let activityTimeout = 120_000
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined
  let heartbeatTimer: ReturnType<typeof setTimeout> | undefined

  function clearConnection() {
    clearTimeout(deadlineTimer)
    clearTimeout(heartbeatTimer)
    subscribed = false
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null
      socket.close()
      socket = null
    }
  }

  function reconnect() {
    if (stopped) return
    clearConnection()
    clearTimeout(retryTimer)
    onStatus("reconnecting")
    retryTimer = setTimeout(open, retryDelay)
    retryDelay = Math.min(retryDelay * 2, 30_000)
  }

  function send(event: string, data: unknown = {}) {
    try {
      if (!socket || socket.readyState !== 1) return false
      socket.send(JSON.stringify({ event, data }))
      return true
    } catch {
      reconnect()
      return false
    }
  }

  function heartbeat() {
    clearTimeout(heartbeatTimer)
    heartbeatTimer = setTimeout(() => {
      if (send("pusher:ping")) deadlineTimer = setTimeout(reconnect, 10_000)
    }, activityTimeout)
  }

  function open() {
    if (stopped) return
    try {
      socket = createSocket(KICK_SOCKET_URL)
      deadlineTimer = setTimeout(reconnect, 10_000)
      socket.onerror = reconnect
      socket.onclose = reconnect
      socket.onmessage = ({ data }) => {
        let frame: Record<string, unknown>
        try {
          const parsed: unknown = JSON.parse(data)
          if (!isRecord(parsed)) return
          frame = parsed
        } catch {
          return
        }
        if (subscribed) {
          clearTimeout(deadlineTimer)
          heartbeat()
        }
        if (frame.event === "pusher:connection_established") {
          try {
            const details = parseData(frame.data)
            if (isRecord(details) && typeof details.activity_timeout === "number" && Number.isFinite(details.activity_timeout)) {
              activityTimeout = Math.min(120, Math.max(10, details.activity_timeout)) * 1000
            }
          } catch { /* Use the default heartbeat interval. */ }
          send("pusher:subscribe", { auth: "", channel: CHAT_CHANNEL })
        } else if (
          frame.event === "pusher_internal:subscription_succeeded" &&
          frame.channel === CHAT_CHANNEL
        ) {
          subscribed = true
          retryDelay = 1000
          clearTimeout(deadlineTimer)
          onStatus("connected")
          heartbeat()
        } else if (frame.event === "pusher:error" || frame.event === "pusher:subscription_error") {
          reconnect()
        } else if (frame.event === "pusher:ping") {
          send("pusher:pong")
        } else if (subscribed && frame.event === CHAT_EVENT && frame.channel === CHAT_CHANNEL) {
          const vote = parseChatVote(frame.data)
          if (vote) onVote(vote)
        }
      }
    } catch {
      reconnect()
    }
  }

  onStatus("connecting")
  open()
  return () => {
    stopped = true
    clearTimeout(retryTimer)
    clearConnection()
  }
}
