import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react"

import { SUBMISSIONS } from "@/src/data/submissions"
import { AudienceVoteStore, getAudienceAverage } from "./audience-votes"
import { connectKickChat, type ChatStatus } from "./kick-chat"

function createStore() {
  let storage: Storage | undefined
  try {
    storage = window.localStorage
  } catch {
    // Storage may be blocked.
  }
  return new AudienceVoteStore(SUBMISSIONS.map(({ id }) => id), storage)
}

export function useAudienceRating(submissionId: string, active: boolean) {
  const [store] = useState(createStore)
  const [status, setStatus] = useState<ChatStatus>("connecting")
  const votes = useSyncExternalStore(store.subscribe, store.getSnapshot)

  useLayoutEffect(() => {
    store.activate(active ? submissionId : null)
    return () => store.activate(null)
  }, [store, submissionId, active])

  useEffect(() => {
    if (!active) return
    return connectKickChat({ onVote: store.record, onStatus: setStatus })
  }, [store, active])

  useEffect(() => {
    window.addEventListener("pagehide", store.flush)
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") store.flush()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.removeEventListener("pagehide", store.flush)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      store.flush()
    }
  }, [store])

  return {
    ...getAudienceAverage(votes[submissionId]),
    status: active ? status : ("paused" as const),
    reset: store.reset,
  }
}
