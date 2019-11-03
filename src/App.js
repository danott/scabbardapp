import React from "react"
import useLocalStorage from "./hooks/useLocalStorage"

import "./App.css"

function parsePassage(passage) {
  let [title, ...text] = passage.split("\n")
  text = text.join("\n")
  return { title, text }
}

function uniq(array) {
  const set = new Set(array)
  return [...set]
}

function App() {
  const [passages, setPassages] = useLocalStorage("passages", [])
  const [selected, setSelected] = useLocalStorage("selected", null)
  const [loading, setLoading] = React.useState(false)

  function searchForPassage(passage) {
    const query = prompt("📖Search for a passage by canonical reference")
    if (query) {
      setLoading(true)
      fetch(`/api/text`, {
        method: "POST",
        body: JSON.stringify({ q: query }),
      })
        .then((r) => r.json())
        .then((payload) => {
          console.info(payload)
          const passage = payload.passages[0]
          if (passage) {
            setSelected(passage)
            setPassages(uniq([...passages, passage]))
          } else {
            alert(
              `🙅‍♀ No passages found for "${query}". Enter a canonical reference like "John 3:16".`,
            )
          }
        })
        .catch((error) => {
          console.log(error)
          alert("😢 An error occurred while searching. Try again soon.")
        })
        .finally(() => setLoading(false))
    }
  }

  function removePassage(passage) {
    // eslint-disable-next-line no-restricted-globals
    if (confirm("🗑 This cannot be undone")) {
      setPassages(passages.filter((candidate) => candidate !== passage))
      setSelected(null)
    }
  }

  const showBlankSlate = passages.length === 0

  return (
    <div className="App">
      {loading ? (
        <Loading />
      ) : showBlankSlate ? (
        <BlankState onSearch={searchForPassage} />
      ) : selected ? (
        <Passage
          passage={selected}
          onExit={() => setSelected(null)}
          onRemove={() => removePassage(selected)}
        />
      ) : (
        <>
          <PassageList
            passages={passages}
            onSelect={setSelected}
            onSearch={searchForPassage}
          />
        </>
      )}
    </div>
  )
}

export function Loading({ verb = "Loading" }) {
  const books = ["📕", "📒", "📙", "📗", "📘", "📓", "📔"]
  const [step, setStep] = React.useState(0)
  React.useEffect(() => {
    const timeout = setTimeout(() => setStep((step + 1) % books.length), 200)
    return () => {
      clearTimeout(timeout)
    }
  }, [books.length, step])

  return (
    <div class="Screen">
      <h1>
        <span role="img" aria-label="Book icon">
          {books[step]}
        </span>{" "}
        {verb}
      </h1>
    </div>
  )
}
function Passage({ passage, onExit, onRemove }) {
  const { title, text } = parsePassage(passage)
  return (
    <div className="Screen">
      <h1>{title}</h1>
      <div>{text}</div>
      <div className="ButtonGroup">
        <button className="Button" onClick={onExit}>
          <span role="img" aria-label="Carriage return arrow">
            ⏎
          </span>{" "}
          Return to list
        </button>
        <button className="Button" onClick={onRemove}>
          <span role="img" aria-label="Trash can">
            🗑
          </span>{" "}
          Remove from list
        </button>
      </div>
    </div>
  )
}

function PassageList({ passages, onSearch, onSelect }) {
  function PassageListItem({ passage }) {
    const { title } = parsePassage(passage)
    return (
      <li>
        <button className="TextButton" onClick={() => onSelect(passage)}>
          {title}
        </button>
      </li>
    )
  }

  return (
    <div className="Screen">
      <h1>Passages</h1>
      <ul>
        {passages.map((passage) => (
          <PassageListItem passage={passage} />
        ))}
      </ul>
      <div className="ButtonGroup">
        <button className="Button" onClick={onSearch}>
          <span role="img" aria-label="Plus sign">
            ➕
          </span>{" "}
          Add passage
        </button>
      </div>
    </div>
  )
}

function BlankState({ onSearch }) {
  return (
    <div className="Screen">
      <h1>Scabbard</h1>

      <div>
        <p>
          Scabbard is a tool for memorizing passages of scripture. Search for
          passages with a canonical refrence such as "Luke 11:11".
        </p>

        <p>
          There's no accounts for syncing devices or any of that. The goal is to
          have your brain remember these things, rather than computers.
        </p>
      </div>

      <div className="ButtonGroup">
        <button className="Button" onClick={onSearch}>
          <span role="img" aria-label="Plus sign">
            ➕
          </span>{" "}
          Add a passage
        </button>
      </div>
    </div>
  )
}

export default App
