export type Coordinates = readonly [x: number, y: number, z: number]

export interface Submission {
  id: string
  kick: string
  minecraft: string
  coordinates: Coordinates | null
  name: string
  placeholder?: boolean
}

export const SUBMISSIONS: readonly Submission[] = [
  {
    id: "markizpl-dziki-wzwod",
    kick: "MarkizPL",
    minecraft: "MarkizQYT_PL",
    coordinates: [-1512, 71, 1115],
    name: "Miasteczko Dziki Wzwód",
  },
  {
    id: "submission-placeholder-2",
    kick: "Do uzupełnienia",
    minecraft: "Do uzupełnienia",
    coordinates: null,
    name: "Zgłoszenie 2 — do uzupełnienia",
    placeholder: true,
  },
  {
    id: "submission-placeholder-3",
    kick: "Do uzupełnienia",
    minecraft: "Do uzupełnienia",
    coordinates: null,
    name: "Zgłoszenie 3 — do uzupełnienia",
    placeholder: true,
  },
  {
    id: "submission-placeholder-4",
    kick: "Do uzupełnienia",
    minecraft: "Do uzupełnienia",
    coordinates: null,
    name: "Zgłoszenie 4 — do uzupełnienia",
    placeholder: true,
  },
] as const
