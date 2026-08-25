export type Coordinates = readonly [
  x: number,
  y: number | null,
  z: number,
]

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
    id: "koxag79-piramida-aztekow-i-ruiny",
    kick: "Koxag79",
    minecraft: "Koxag79",
    coordinates: [-3628, 104, 5814],
    name: "Piramida Azteków i Ruiny",
  },
  {
    id: "prezescs2-miasteczko-dzikiego-zachodu",
    kick: "PREZESCS2",
    minecraft: "PREZESCS2",
    coordinates: [-665, 68, -31],
    name:
      "Miasteczko rodem z Dzikiego Zachodu wraz z kopalnia złota związaną z filmem The Haunting of Hell Hole Mine",
  },
  {
    id: "pytanek-plan-filmowy-west-life",
    kick: "Pytanek",
    minecraft: "JednoPytanko",
    coordinates: [-4824, 67, -4845],
    name: "Plan Filmowy: West-Life",
  },
  {
    id: "sl3dziv-swiatynia-grecka-le-zeusa",
    kick: "sl3dziv",
    minecraft: "sl3dziv_",
    coordinates: [6151, 113, 1883],
    name: "Świątynia Grecka Le Zeusa",
  },
  {
    id: "zyphlix-plan-filmowy-daltonowie",
    kick: "Zyphlix",
    minecraft: "Zyphlix",
    coordinates: [-4256.572, 64, -5011.859],
    name: 'Plan filmowy "Daltonowie"',
  },
  {
    id: "xmahel-partenon",
    kick: "Xmahel",
    minecraft: "Xmahel_yt",
    coordinates: [-3135, null, 5796],
    name: "Partenon",
  },
  {
    id: "gitara69-dziki-zachod",
    kick: "gitara69",
    minecraft: "gitaraa",
    coordinates: [-4431, null, -4832],
    name: "Dziki Zachód",
  },
  {
    id: "etherekk-indiana-jones",
    kick: "etherekk",
    minecraft: "Ethere4l",
    coordinates: [3694, 95, -1753],
    name: "Indiana Jones i Świątynia Zagłady",
  },
  {
    id: "szymczokok-puente-antiguo",
    kick: "Szymczokok",
    minecraft: "sitrim",
    coordinates: [5458, 74, -2380],
    name: "Puente Antiguo (Thor)",
  },
  {
    id: "fenny-kinger-olimpijska-sprawiedliwosc",
    kick: "Fenny Kinger",
    minecraft: "Fenny Kinger",
    coordinates: [4571, 63, 1772],
    name: "olimpijska sprawiedliwość",
  },
  {
    id: "mgntc-dziki-wzwod",
    kick: "MgNtc",
    minecraft: "MGNTC",
    coordinates: [-2485, 63, -3951],
    name: "Dziki Wzwód",
  },
] as const
