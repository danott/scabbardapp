// Scabbard: passages live in localStorage as strings. The first line of each
// string is the title and the rest is the text. The URL hash picks the screen:
// "#/" is the list and "#/passage/2" is a single passage.

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

function render() {
  const passages = load()
  const index = currentIndex()

  if (index !== null && passages[index]) {
    const { title, text } = parse(passages[index])
    $("#passage-title").textContent = title
    $("#passage-text").textContent = text
    document.title = `${title} · Scabbard`
    return show("passage")
  }

  document.title = "Scabbard"
  if (passages.length === 0) return show("blank")

  $("#count").textContent = passages.length
  $("#passages").replaceChildren(
    ...passages.map((passage, i) => {
      const { title, text } = parse(passage)
      const item = document.createElement("li")
      item.innerHTML = `
        <a class="passage-card">
          <span class="body"><span class="title"></span><span class="preview"></span></span>
          <span class="chevron"><svg><use href="#i-chevron" /></svg></span>
        </a>`
      item.querySelector("a").href = `#/passage/${i}`
      item.querySelector(".title").textContent = title
      item.querySelector(".preview").textContent = text.replace(/\s+/g, " ")
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
  location.hash = "#/"
}

// Accent color. index.html applies the saved choice before the first paint.

const accent = $("#accent")

function applyAccent() {
  let saved = null
  try {
    saved = localStorage.getItem("accent")
  } catch {}
  accent.value = saved || "coral"
  if (!accent.value) accent.value = "coral" // an option that no longer exists
  document.documentElement.dataset.accent = accent.value
}

accent.addEventListener("change", () => {
  localStorage.setItem("accent", accent.value)
  applyAccent()
})

// Wiring

form.addEventListener("submit", (event) => {
  event.preventDefault()
  search(form.q.value.trim())
})

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action
  if (action === "add") openSearch()
  if (action === "cancel") dialog.close()
  if (action === "remove") removeCurrent()
})

addEventListener("hashchange", render)
addEventListener("storage", () => {
  // another tab changed the list or the accent color
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
