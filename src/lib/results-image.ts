import {
  createRanking,
  type Category,
  type Scores,
} from "@/src/lib/contest-state"

const IMAGE_SCALE = 2
const IMAGE_PADDING = 64
const TITLE_HEIGHT = 80
const TABLE_HEADER_HEIGHT = 80
const TABLE_ROW_HEIGHT = 112
const PLACE_COLUMN_WIDTH = 96
const SUBMISSION_COLUMN_WIDTH = 560
const SCORE_COLUMN_WIDTH = 148
const PERCENTAGE_COLUMN_WIDTH = 120
const MIN_CATEGORY_COLUMN_WIDTH = 152
const MAX_CATEGORY_COLUMN_WIDTH = 224

interface Column {
  label: string
  width: number
  align: CanvasTextAlign
}

interface ResultsImageColors {
  background: string
  foreground: string
  muted: string
  mutedForeground: string
  border: string
  primary: string
  primaryForeground: string
  gold: string
  goldForeground: string
  silver: string
  silverForeground: string
  bronze: string
  bronzeForeground: string
}

function getThemeColor(
  styles: CSSStyleDeclaration,
  variable: string,
  fallback: string,
) {
  return (
    styles.getPropertyValue(variable).trim() ||
    fallback
  )
}

function getImageColors(): ResultsImageColors {
  const root = document.documentElement
  const useDarkTheme =
    root.classList.contains("dark") ||
    (!root.classList.contains("light") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  const themeProbe = document.createElement("div")

  if (useDarkTheme && !root.classList.contains("dark")) {
    themeProbe.className = "dark"
    themeProbe.hidden = true
    document.body.append(themeProbe)
  }

  const styles = getComputedStyle(
    themeProbe.isConnected ? themeProbe : document.documentElement,
  )
  const colors = {
    background: getThemeColor(styles, "--background", "#ffffff"),
    foreground: getThemeColor(styles, "--foreground", "#171717"),
    muted: getThemeColor(styles, "--muted", "#f5f5f5"),
    mutedForeground: getThemeColor(
      styles,
      "--muted-foreground",
      "#737373",
    ),
    border: getThemeColor(styles, "--border", "#e5e5e5"),
    primary: getThemeColor(styles, "--primary", "#6d28d9"),
    primaryForeground: getThemeColor(
      styles,
      "--primary-foreground",
      "#faf5ff",
    ),
    gold: getThemeColor(styles, "--podium-gold", "#d7ad3f"),
    goldForeground: getThemeColor(
      styles,
      "--podium-gold-foreground",
      "#3f3217",
    ),
    silver: getThemeColor(styles, "--podium-silver", "#aeb5c0"),
    silverForeground: getThemeColor(
      styles,
      "--podium-silver-foreground",
      "#29303d",
    ),
    bronze: getThemeColor(styles, "--podium-bronze", "#b66e39"),
    bronzeForeground: getThemeColor(
      styles,
      "--podium-bronze-foreground",
      "#3f2518",
    ),
  }

  themeProbe.remove()

  return colors
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maximumWidth: number,
) {
  if (context.measureText(text).width <= maximumWidth) {
    return text
  }

  const ellipsis = "…"
  let shortened = text

  while (
    shortened.length > 0 &&
    context.measureText(`${shortened}${ellipsis}`).width > maximumWidth
  ) {
    shortened = shortened.slice(0, -1)
  }

  return `${shortened.trimEnd()}${ellipsis}`
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maximumWidth: number,
  maximumLines: number,
) {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let currentLine = ""

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]
    const candidate = currentLine ? `${currentLine} ${word}` : word

    if (context.measureText(candidate).width <= maximumWidth) {
      currentLine = candidate
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
    } else {
      lines.push(fitText(context, word, maximumWidth))
    }

    currentLine = word

    if (lines.length === maximumLines - 1) {
      const remainder = [currentLine, ...words.slice(index + 1)].join(" ")
      lines.push(fitText(context, remainder, maximumWidth))
      return lines
    }
  }

  if (currentLine && lines.length < maximumLines) {
    lines.push(fitText(context, currentLine, maximumWidth))
  }

  return lines
}

function drawCenteredLines(
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  centerX: number,
  centerY: number,
  lineHeight: number,
) {
  const firstBaseline = centerY - ((lines.length - 1) * lineHeight) / 2

  lines.forEach((line, index) => {
    context.fillText(line, centerX, firstBaseline + index * lineHeight)
  })
}

function createColumns(
  context: CanvasRenderingContext2D,
  categories: readonly Category[],
): Column[] {
  context.font = "600 17px 'IBM Plex Sans Variable', sans-serif"

  return [
    { label: "Miejsce", width: PLACE_COLUMN_WIDTH, align: "center" },
    {
      label: "Zgłoszenie",
      width: SUBMISSION_COLUMN_WIDTH,
      align: "left",
    },
    { label: "Wynik", width: SCORE_COLUMN_WIDTH, align: "center" },
    { label: "Procent", width: PERCENTAGE_COLUMN_WIDTH, align: "center" },
    ...categories.map((category) => ({
      label: category.name,
      width: Math.min(
        MAX_CATEGORY_COLUMN_WIDTH,
        Math.max(
          MIN_CATEGORY_COLUMN_WIDTH,
          context.measureText(category.name).width + 40,
        ),
      ),
      align: "center" as const,
    })),
  ]
}

function drawTableHeader(
  context: CanvasRenderingContext2D,
  columns: readonly Column[],
  tableX: number,
  tableY: number,
  colors: ResultsImageColors,
) {
  const tableWidth = columns.reduce((width, column) => width + column.width, 0)

  context.fillStyle = colors.primary
  context.fillRect(tableX, tableY, tableWidth, TABLE_HEADER_HEIGHT)
  context.fillStyle = colors.primaryForeground
  context.font = "600 17px 'IBM Plex Sans Variable', sans-serif"
  context.textBaseline = "middle"

  let columnX = tableX

  columns.forEach((column) => {
    const innerPadding = 18
    const maximumWidth = column.width - innerPadding * 2
    const lines = wrapText(context, column.label, maximumWidth, 2)

    context.textAlign = column.align
    drawCenteredLines(
      context,
      lines,
      column.align === "left" ? columnX + innerPadding : columnX + column.width / 2,
      tableY + TABLE_HEADER_HEIGHT / 2,
      21,
    )

    columnX += column.width
  })
}

function drawPlacement(
  context: CanvasRenderingContext2D,
  placement: number,
  centerX: number,
  centerY: number,
  colors: ResultsImageColors,
) {
  const podiumColors = [
    [colors.gold, colors.goldForeground],
    [colors.silver, colors.silverForeground],
    [colors.bronze, colors.bronzeForeground],
  ]
  const [background, foreground] = podiumColors[placement - 1] ?? [
    colors.muted,
    colors.foreground,
  ]

  context.fillStyle = background
  context.fillRect(centerX - 22, centerY - 17, 44, 34)
  context.fillStyle = foreground
  context.font = "600 18px 'IBM Plex Sans Variable', sans-serif"
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(String(placement), centerX, centerY)
}

export function createResultsImageUrl(
  categories: readonly Category[],
  scores: Scores,
) {
  const measurementCanvas = document.createElement("canvas")
  const measurementContext = measurementCanvas.getContext("2d")

  if (!measurementContext) {
    throw new Error("Przeglądarka nie obsługuje eksportu obrazu.")
  }

  const columns = createColumns(measurementContext, categories)
  const tableWidth = columns.reduce((width, column) => width + column.width, 0)
  const ranking = createRanking(categories, scores)
  const imageWidth = tableWidth + IMAGE_PADDING * 2
  const imageHeight =
    IMAGE_PADDING * 2 +
    TITLE_HEIGHT +
    TABLE_HEADER_HEIGHT +
    ranking.length * TABLE_ROW_HEIGHT
  const canvas = document.createElement("canvas")

  canvas.width = imageWidth * IMAGE_SCALE
  canvas.height = imageHeight * IMAGE_SCALE

  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("Przeglądarka nie obsługuje eksportu obrazu.")
  }

  context.scale(IMAGE_SCALE, IMAGE_SCALE)

  const colors = getImageColors()
  const tableX = IMAGE_PADDING
  const tableY = IMAGE_PADDING + TITLE_HEIGHT

  context.fillStyle = colors.background
  context.fillRect(0, 0, imageWidth, imageHeight)

  context.fillStyle = colors.foreground
  context.font = "600 40px 'IBM Plex Sans Variable', sans-serif"
  context.textAlign = "left"
  context.textBaseline = "alphabetic"
  context.fillText("Podsumowanie Konkursu", IMAGE_PADDING, IMAGE_PADDING + 42)

  drawTableHeader(context, columns, tableX, tableY, colors)

  ranking.forEach((row, rowIndex) => {
    const rowY = tableY + TABLE_HEADER_HEIGHT + rowIndex * TABLE_ROW_HEIGHT

    if (rowIndex % 2 === 1) {
      context.save()
      context.globalAlpha = 0.45
      context.fillStyle = colors.muted
      context.fillRect(tableX, rowY, tableWidth, TABLE_ROW_HEIGHT)
      context.restore()
    }

    context.strokeStyle = colors.border
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(tableX, rowY + TABLE_ROW_HEIGHT)
    context.lineTo(tableX + tableWidth, rowY + TABLE_ROW_HEIGHT)
    context.stroke()

    let columnX = tableX
    const centerY = rowY + TABLE_ROW_HEIGHT / 2

    drawPlacement(
      context,
      rowIndex + 1,
      columnX + PLACE_COLUMN_WIDTH / 2,
      centerY,
      colors,
    )
    columnX += PLACE_COLUMN_WIDTH

    context.fillStyle = colors.foreground
    context.font = "600 19px 'IBM Plex Sans Variable', sans-serif"
    context.textAlign = "left"
    context.textBaseline = "alphabetic"
    const nameLines = wrapText(
      context,
      row.submission.name,
      SUBMISSION_COLUMN_WIDTH - 36,
      3,
    )
    const submissionTextHeight = nameLines.length * 24 + 25
    const submissionStartY = rowY + (TABLE_ROW_HEIGHT - submissionTextHeight) / 2 + 18

    nameLines.forEach((line, lineIndex) => {
      context.fillText(line, columnX + 18, submissionStartY + lineIndex * 24)
    })

    context.fillStyle = colors.mutedForeground
    context.font = "400 16px 'IBM Plex Sans Variable', sans-serif"
    context.fillText(
      row.submission.minecraft,
      columnX + 18,
      submissionStartY + nameLines.length * 24 + 3,
    )
    columnX += SUBMISSION_COLUMN_WIDTH

    context.fillStyle = colors.foreground
    context.font = "600 18px 'IBM Plex Sans Variable', sans-serif"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText(
      `${row.total}/${row.maximum}`,
      columnX + SCORE_COLUMN_WIDTH / 2,
      centerY,
    )
    columnX += SCORE_COLUMN_WIDTH

    context.font = "400 18px 'IBM Plex Sans Variable', sans-serif"
    context.fillText(
      `${row.percentage}%`,
      columnX + PERCENTAGE_COLUMN_WIDTH / 2,
      centerY,
    )
    columnX += PERCENTAGE_COLUMN_WIDTH

    categories.forEach((category, categoryIndex) => {
      const column = columns[categoryIndex + 4]
      const score = scores[row.submission.id]?.[category.id] ?? "—"

      context.fillText(String(score), columnX + column.width / 2, centerY)
      columnX += column.width
    })
  })

  const tableBottom =
    tableY + TABLE_HEADER_HEIGHT + ranking.length * TABLE_ROW_HEIGHT

  context.strokeStyle = colors.border
  context.lineWidth = 1
  context.strokeRect(tableX + 0.5, tableY + 0.5, tableWidth - 1, tableBottom - tableY)

  let separatorX = tableX

  columns.slice(0, -1).forEach((column) => {
    separatorX += column.width
    context.beginPath()
    context.moveTo(separatorX, tableY)
    context.lineTo(separatorX, tableBottom)
    context.stroke()
  })

  return canvas.toDataURL("image/png")
}
