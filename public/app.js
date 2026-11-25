// Scabbard: passages live in localStorage as strings. The first line of each
// string is the title and the rest is the text. The URL hash picks the screen:
// "#/" is the list and "#/passage/2" is a single passage.
//
// Review progress lives in localStorage too, under "progress", keyed by title
// so that removing a passage (and shifting the indexes) doesn't scramble it.

const $ = (selector) => document.querySelector(selector)

function load() {
  try {
    return JSON.parse(localStorage.getItem("passages")) || []
  } catch {
    return []
  }
}

function save(passages) {
  localStorage.setItem("passages", JSON.stringify(passages))
}

function parse(passage) {
  const [title, ...text] = passage.split("\n")
  return { title, text: text.join("\n").trim() }
}

function currentIndex() {
  const match = location.hash.match(/^#\/passage\/(\d+)$/)
  return match ? Number(match[1]) : null
}

function show(id) {
  for (const section of document.querySelectorAll("main > section")) {
    section.hidden = section.id !== id
  }
}

function getItem(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

// Dates are local calendar days as "YYYY-MM-DD", so a review is due on a day,
// not at an hour.

function today() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function dayString(date) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(days) {
  const d = today()
  d.setDate(d.getDate() + days)
  return dayString(d)
}

function daysUntil(day) {
  const [y, m, d] = day.split("-").map(Number)
  return Math.round((new Date(y, m - 1, d) - today()) / 86400000)
}

function describeDays(days) {
  if (days <= 0) return "today"
  if (days === 1) return "tomorrow"
  if (days < 14) return `in ${days} days`
  if (days < 60) return `in ${Math.round(days / 7)} weeks`
  if (days < 365) return `in ${Math.round(days / 30)} months`
  return `in ${Math.round(days / 365)} ${days < 548 ? "year" : "years"}`
}

function shortDays(days) {
  if (days <= 0) return "Today"
  if (days < 14) return `${days}d`
  if (days < 60) return `${Math.round(days / 7)}w`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${Math.round(days / 365)}y`
}

// Spaced repetition. A small take on SM-2, the algorithm behind SuperMemo and
// Anki: each good recall multiplies the gap before the next review by an ease
// factor, and a struggle shrinks the ease. "Again" keeps it due today.

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem("progress")) || {}
  } catch {
    return {}
  }
}

function saveProgress(progress) {
  setItem("progress", JSON.stringify(progress))
}

function schedule(card = {}, grade) {
  let { interval = 0, ease = 2.5, reps = 0, lapses = 0 } = card

  if (grade === "again") {
    return { ...card, interval: 0, ease: Math.max(1.3, ease - 0.2), reps: 0, lapses: lapses + 1, due: addDays(0) }
  }

  if (reps === 0) interval = { hard: 1, good: 1, easy: 3 }[grade]
  else if (reps === 1) interval = { hard: 2, good: 3, easy: 6 }[grade]
  else {
    const factor = { hard: 1.2, good: ease, easy: ease * 1.3 }[grade]
    interval = Math.max(interval + 1, Math.round(interval * factor))
  }
  ease = Math.max(1.3, ease + { hard: -0.15, good: 0, easy: 0.15 }[grade])

  return { ...card, interval, ease, reps: reps + 1, lapses, due: addDays(interval) }
}

// A passage nobody has reviewed yet is "new"; new passages are part of the
// review queue too, since they're the ones that most need practice.
function isDue(card) {
  return !card?.due || daysUntil(card.due) <= 0
}

function dueIndexes(passages, progress) {
  return passages.map((p, i) => i).filter((i) => isDue(progress[parse(passages[i]).title]))
}

// Breaking a passage into words. Whitespace and dashes separate tokens; each
// word keeps its surrounding punctuation separate so that hiding "world," hides
// "world" and leaves the comma. Verse numbers like "[16]" and the "(ESV)"
// notice aren't words to practice.

function tokenize(text) {
  return text
    .split(/(\s+|—|–)/)
    .filter(Boolean)
    .map((piece) => {
      const lead = piece.match(/^[^\p{L}\p{N}]*/u)[0]
      const trail = piece.slice(lead.length).match(/[^\p{L}\p{N}]*$/u)[0]
      const core = piece.slice(lead.length, piece.length - trail.length)
      const word = core !== "" && !/^\[\d+\]$/.test(piece) && piece !== "(ESV)"
      return word ? { word, lead, core, trail } : { text: piece }
    })
}

const fold = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()

function shuffle(items) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Practice. One session at a time, reset whenever you open a different passage.

const MODES = {
  read: "Read it aloud a few times. When you're ready, switch to Blanks and say it without looking.",
  blanks: "Say the whole passage aloud, filling in the blanks. Tap a blank to peek. Hide more words each time.",
  letters: "Only the first letter of each word is left. Recite the passage, tapping a word to peek.",
  type: "Type the first letter of each word from memory. A wrong letter shows the word in red and moves on.",
}

const LEVELS = [
  [0.25, "1 in 4 words hidden"],
  [0.5, "Half the words hidden"],
  [0.75, "3 in 4 words hidden"],
  [1, "Every word hidden"],
]

let session = {}

function startSession(title, text) {
  const tokens = tokenize(text)
  const words = tokens.flatMap((t, i) => (t.word ? [i] : []))
  const card = loadProgress()[title]
  let mode = getItem("mode", "read")
  if (!MODES[mode]) mode = "read"
  // Nothing to recall on a first visit; start by reading it.
  if (!card) mode = "read"
  session = { title, text, tokens, words, order: shuffle(words), mode, level: card?.level ?? 0 }
  resetAttempt()
}

function resetAttempt() {
  session.peeked = new Set()
  session.results = []
  session.pos = 0
}

function hiddenSet() {
  const count = Math.ceil(session.words.length * LEVELS[session.level][0])
  return new Set(session.order.slice(0, count))
}

function wordSpan(token, i, className) {
  const span = document.createElement("span")
  span.className = `word ${className}`
  span.dataset.i = i
  return span
}

function renderText() {
  const { mode, tokens } = session
  const target = $("#passage-text")
  target.dataset.mode = mode

  if (mode === "read") return (target.textContent = session.text)

  const hidden = mode === "blanks" ? hiddenSet() : null
  const current = session.words[session.pos]
  const fragment = document.createDocumentFragment()

  tokens.forEach((token, i) => {
    if (!token.word) return fragment.append(token.text)
    fragment.append(token.lead)

    let span
    if (mode === "type") {
      const n = session.words.indexOf(i)
      const result = session.results[n]
      span = wordSpan(token, i, result || (i === current ? "hidden current" : "hidden"))
      span.textContent = token.core
    } else if (session.peeked.has(i) || (hidden && !hidden.has(i))) {
      span = wordSpan(token, i, session.peeked.has(i) ? "peeked" : "")
      span.textContent = token.core
    } else {
      span = wordSpan(token, i, "hidden")
      span.tabIndex = 0
      span.setAttribute("role", "button")
      span.setAttribute("aria-label", "Hidden word, tap to reveal")
      if (mode === "letters") {
        const rest = document.createElement("span")
        rest.className = "rest"
        rest.textContent = token.core.slice(1)
        span.append(token.core[0], rest)
      } else {
        span.textContent = token.core
      }
    }
    fragment.append(span, token.trail)
  })

  target.replaceChildren(fragment)
}

function renderBar() {
  const bar = $("#practice-bar")
  const { mode } = session
  bar.hidden = mode !== "blanks" && mode !== "type"

  if (mode === "blanks") {
    bar.innerHTML = `
      <button type="button" class="icon-button" data-action="fewer" aria-label="Hide fewer words"><svg><use href="#i-minus" /></svg></button>
      <span class="bar-label"></span>
      <button type="button" class="icon-button" data-action="more" aria-label="Hide more words"><svg><use href="#i-plus" /></svg></button>`
    bar.querySelector(".bar-label").textContent = LEVELS[session.level][1]
    bar.querySelector("[data-action=fewer]").disabled = session.level === 0
    bar.querySelector("[data-action=more]").disabled = session.level === LEVELS.length - 1
  }

  if (mode === "type") {
    const missed = session.results.filter((r) => r === "missed").length
    bar.innerHTML = `
      <span class="bar-label"></span>
      <button type="button" class="icon-button" data-action="restart" aria-label="Start over"><svg><use href="#i-restart" /></svg></button>`
    bar.querySelector(".bar-label").textContent =
      `${session.pos} of ${session.words.length} words` + (missed ? ` · ${missed} missed` : "")
  }
}

// What the practice suggests you rate it, so the buttons can nudge.
function suggestion() {
  const { mode, words } = session
  if (mode === "type") {
    if (session.pos < words.length) return null
    const missed = session.results.filter((r) => r === "missed").length
    if (missed === 0) return "good"
    return missed / words.length <= 0.1 ? "hard" : "again"
  }
  if (mode === "blanks" && session.level < LEVELS.length - 1) return null
  const peeks = session.peeked.size
  if (peeks === 0) return null
  return peeks / words.length <= 0.1 ? "hard" : "again"
}

function renderGrade() {
  const grade = $("#grade")
  grade.hidden = session.mode === "read"
  if (grade.hidden) return

  const card = loadProgress()[session.title]
  const suggested = suggestion()
  for (const button of grade.querySelectorAll("[data-grade]")) {
    const next = schedule(card, button.dataset.grade)
    button.querySelector("small").textContent = shortDays(next.interval)
    button.classList.toggle("suggested", button.dataset.grade === suggested)
  }

  const { mode, words } = session
  const missed = session.results.filter((r) => r === "missed").length
  const peeks = session.peeked.size
  let note = "Rate it once you've said the whole passage. The better you knew it, the longer until it comes back."
  if (mode === "type" && session.pos === words.length) {
    note = missed
      ? `You got ${words.length - missed} of ${words.length} words.`
      : `Every one of ${words.length} words. Well done.`
  } else if (mode !== "type" && peeks) {
    note = `You peeked at ${peeks} ${peeks === 1 ? "word" : "words"}.`
  }
  $("#grade-note").textContent = note
}

function renderPractice() {
  const { mode } = session
  for (const button of document.querySelectorAll("[data-mode]")) {
    button.setAttribute("aria-pressed", button.dataset.mode === mode)
  }
  $("#mode-hint").textContent = MODES[mode]
  $("#passage-card").classList.toggle("typing", mode === "type")
  $("#passage-card").classList.toggle("finished", mode === "type" && session.pos === session.words.length)
  renderText()
  renderBar()
  renderGrade()
}

function setMode(mode) {
  session.mode = mode
  setItem("mode", mode)
  resetAttempt()
  renderPractice()
  if (mode === "type") $("#type-input").focus()
}

function setLevel(level) {
  session.level = Math.max(0, Math.min(LEVELS.length - 1, level))
  // A fresh shuffle each time, so the same words aren't always the hard ones.
  session.order = shuffle(session.words)
  session.peeked = new Set()
  const progress = loadProgress()
  if (progress[session.title]) {
    progress[session.title].level = session.level
    saveProgress(progress)
  }
  renderPractice()
}

function peek(element) {
  if (!element?.classList.contains("hidden") || session.mode === "type") return
  session.peeked.add(Number(element.dataset.i))
  renderPractice()
}

function typeLetter(letter) {
  const { words, tokens } = session
  if (session.pos >= words.length || !/[\p{L}\p{N}]/u.test(letter)) return
  const token = tokens[words[session.pos]]
  const right = fold(letter) === fold(token.core[0])
  session.results[session.pos++] = right ? "got" : "missed"
  renderPractice()
  const current = $("#passage-text .current")
  current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  if (!right) navigator.vibrate?.(30)
}

function grade(value) {
  const progress = loadProgress()
  const next = schedule(progress[session.title], value)
  next.level = session.level
  // Knowing it well with only some words hidden means it's time to hide more.
  if (session.mode === "blanks" && (value === "good" || value === "easy")) {
    next.level = Math.min(LEVELS.length - 1, session.level + 1)
  }
  progress[session.title] = next
  saveProgress(progress)

  toast(value === "again" ? "Keep at it. It'll stay in today's review." : `Next review ${describeDays(next.interval)}.`)

  // Move on to the next passage due for review, or back to the list.
  const passages = load()
  const here = currentIndex()
  const due = dueIndexes(passages, progress).filter((i) => i !== here)
  const after = due.find((i) => i > here) ?? due[0]
  location.hash = after === undefined ? "#/" : `#/passage/${after}`
}

let toastTimer
function toast(message) {
  const el = $("#toast")
  el.textContent = message
  el.classList.add("visible")
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove("visible"), 2600)
}

// Screens

function render() {
  const passages = load()
  const progress = loadProgress()
  const index = currentIndex()

  if (index !== null && passages[index]) {
    const { title, text } = parse(passages[index])
    if (session.title !== title || session.text !== text) startSession(title, text)
    const card = progress[title]
    $("#passage-title").textContent = title
    $("#passage-status").textContent = !card
      ? "New. You haven't reviewed it yet."
      : isDue(card)
        ? `Due for review today${card.reps ? ` · reviewed ${card.reps} ${card.reps === 1 ? "time" : "times"} in a row` : ""}`
        : `Next review ${describeDays(daysUntil(card.due))} · reviewed ${card.reps} ${card.reps === 1 ? "time" : "times"} in a row`
    document.title = `${title} · Scabbard`
    renderPractice()
    return show("passage")
  }

  session = {}
  document.title = "Scabbard"
  if (passages.length === 0) return show("blank")

  const due = dueIndexes(passages, progress)
  $("#review-banner").hidden = due.length === 0
  $("#review-count").textContent = `${due.length} ${due.length === 1 ? "passage" : "passages"} to review today`

  $("#count").textContent = passages.length
  $("#passages").replaceChildren(
    ...passages.map((passage, i) => {
      const { title, text } = parse(passage)
      const card = progress[title]
      const item = document.createElement("li")
      item.innerHTML = `
        <a class="passage-card">
          <span class="body"><span class="title-row"><span class="title"></span><span class="chip"></span></span><span class="preview"></span></span>
          <span class="chevron"><svg><use href="#i-chevron" /></svg></span>
        </a>`
      item.querySelector("a").href = `#/passage/${i}`
      item.querySelector(".title").textContent = title
      item.querySelector(".preview").textContent = text.replace(/\s+/g, " ")
      const chip = item.querySelector(".chip")
      if (!card) {
        chip.textContent = "New"
        chip.classList.add("due")
      } else if (isDue(card)) {
        chip.textContent = "Due"
        chip.classList.add("due")
      } else {
        chip.textContent = shortDays(daysUntil(card.due))
        chip.title = `Next review ${describeDays(daysUntil(card.due))}`
      }
      return item
    }),
  )
  show("list")
}

// Searching

const dialog = $("#search")
const form = dialog.querySelector("form")
const submit = form.querySelector("[type=submit]")
const error = $("#search-error")

function openSearch() {
  form.reset()
  error.textContent = ""
  dialog.showModal()
}

function setLoading(loading) {
  const books = ["📕", "📒", "📙", "📗", "📘", "📓", "📔"]
  clearInterval(setLoading.timer)
  form.querySelectorAll("input, button").forEach((el) => (el.disabled = loading))
  submit.textContent = "Add"
  if (!loading) return
  let step = 0
  const tick = () => (submit.textContent = `${books[step++ % books.length]} Loading`)
  tick()
  setLoading.timer = setInterval(tick, 200)
}

async function search(query) {
  if (!navigator.onLine) {
    error.textContent = "There's no network connection. Try again when you're back online."
    return
  }

  error.textContent = ""
  setLoading(true)
  try {
    const response = await fetch("/api/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: query }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const passage = (await response.json()).passages?.[0]

    if (!passage) {
      error.textContent = `🙅 No passages found for “${query}”. Enter a canonical reference such as “John 3:16”.`
      return
    }

    const passages = load()
    if (!passages.includes(passage)) passages.push(passage)
    save(passages)
    dialog.close()
    location.hash = `#/passage/${passages.indexOf(passage)}`
  } catch (e) {
    console.error(e)
    error.textContent = "😢 An error occurred while searching. Try again soon."
  } finally {
    setLoading(false)
  }
}

function removeCurrent() {
  const passages = load()
  const index = currentIndex()
  const { title } = parse(passages[index])
  if (!confirm(`🗑 Are you sure you want to remove ${title} from the list?`)) return
  passages.splice(index, 1)
  save(passages)
  const progress = loadProgress()
  delete progress[title]
  saveProgress(progress)
  location.hash = "#/"
}

function startReview() {
  const passages = load()
  const [first] = dueIndexes(passages, loadProgress())
  if (first !== undefined) location.hash = `#/passage/${first}`
}

// Settings. The accent color is the only one so far. index.html applies the
// saved accent before the first paint; this keeps the radio buttons in step.

const settings = $("#settings")
const accents = [...settings.querySelectorAll("input[name=accent]")]

function applyAccent() {
  const saved = getItem("accent", null)
  // Fall back to the first (coral) if the saved one no longer exists.
  const input = accents.find((input) => input.value === saved) || accents[0]
  input.checked = true
  document.documentElement.dataset.accent = input.value
}

settings.addEventListener("change", (event) => {
  if (event.target.name !== "accent") return
  setItem("accent", event.target.value)
  applyAccent()
})

// Wiring

form.addEventListener("submit", (event) => {
  event.preventDefault()
  search(form.q.value.trim())
})

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-mode], [data-grade]")
  if (target?.dataset.mode) return setMode(target.dataset.mode)
  if (target?.dataset.grade) return grade(target.dataset.grade)
  const action = target?.dataset.action
  if (action === "add") openSearch()
  if (action === "cancel") dialog.close()
  if (action === "settings") settings.showModal()
  if (action === "remove") removeCurrent()
  if (action === "review") startReview()
  if (action === "more") setLevel(session.level + 1)
  if (action === "fewer") setLevel(session.level - 1)
  if (action === "restart") {
    resetAttempt()
    renderPractice()
    $("#type-input").focus()
  }
})

const passageText = $("#passage-text")
passageText.addEventListener("click", (event) => peek(event.target.closest(".word")))
passageText.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return
  event.preventDefault()
  peek(event.target.closest(".word"))
})

// In Type mode a hidden input takes the keystrokes, so phones show a keyboard.
// Tapping anywhere on the passage brings it back up.
const typeInput = $("#type-input")
$("#passage-card").addEventListener("click", () => {
  if (session.mode === "type") typeInput.focus()
})
typeInput.addEventListener("input", () => {
  const letters = [...typeInput.value]
  typeInput.value = ""
  letters.forEach(typeLetter)
})

// Tapping the dimmed backdrop closes a sheet.
for (const sheet of [dialog, settings]) {
  sheet.addEventListener("click", (event) => {
    const box = sheet.getBoundingClientRect()
    const inside =
      event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom
    if (!inside && event.target === sheet) sheet.close()
  })
}

addEventListener("hashchange", () => {
  render()
  scrollTo(0, 0)
})
addEventListener("storage", () => {
  // another tab changed the list, the progress, or the accent color
  render()
  applyAccent()
})

// The old React version kept a "selected" key; it isn't needed anymore.
localStorage.removeItem("selected")
applyAccent()
render()

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js")
}
