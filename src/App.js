import React from "react";
import useLocalStorage from "./hooks/useLocalStorage";

import "./App.css";

function parsePassage(passage) {
  let [title, ...text] = passage.split("\n");
  text = text.join("\n");
  return { title, text };
}

function uniq(array) {
  const set = new Set(array);
  return [...set];
}

function App() {
  const [passages, setPassages] = useLocalStorage("passages", []);
  const [selected, setSelected] = useLocalStorage("selected", null);

  function searchForPassage(passage) {
    const query = prompt("📖Search for a passage by canonical reference");
    if (query) {
      fetch(`/api/text`, {
        method: "POST",
        body: JSON.stringify({ q: query })
      })
        .then(r => r.json())
        .then(payload => {
          console.log(payload);

          const passage = payload.passages[0];
          if (passage) {
            setSelected(passage);
            setPassages(uniq([...passages, passage]));
          } else {
            alert(
              `🙅‍♀ No passages found for "${query}". Enter a canonical reference like "John 3:16".`
            );
          }
        })
        .catch(error => {
          console.log(error);
          alert("An error occurred while searching. Try again soon.");
        });
    }
  }

  function removePassage(passage) {
    // eslint-disable-next-line no-restricted-globals
    if (confirm("🗑 This cannot be undone")) {
      setPassages(passages.filter(candidate => candidate !== passage));
      setSelected(null);
    }
  }

  return (
    <div className="App">
      {selected ? (
        <Passage
          passage={selected}
          onExit={() => setSelected(null)}
          onRemove={() => removePassage(selected)}
        />
      ) : passages.length > 0 ? (
        <PassageList
          passages={passages}
          onSelect={setSelected}
          onSearch={searchForPassage}
        />
      ) : (
        <BlankState onSearch={searchForPassage} />
      )}
    </div>
  );
}

function Passage({ passage, onExit, onRemove }) {
  const { title, text } = parsePassage(passage);
  return (
    <div>
      <h1>{title}</h1>
      <div>{text}</div>
      <button onClick={onExit}>🔙</button>
      <button onClick={onRemove}>🗑</button>
    </div>
  );
}

function PassageList({ passages, onSearch, onSelect }) {
  function PassageListItem({ passage }) {
    const { title } = parsePassage(passage);
    return <li onClick={() => onSelect(passage)}>{title}</li>;
  }

  return (
    <ul>
      {passages.map(passage => (
        <PassageListItem passage={passage} />
      ))}
      <li>
        <button onClick={onSearch}>
          <span role="img" aria-label="Plus sign">
            ➕
          </span>
          Add passage
        </button>
      </li>
    </ul>
  );
}

function BlankState({ onSearch }) {
  return (
    <div>
      {" "}
      <h1>There are no passages</h1>{" "}
      <button onClick={onSearch}>
        <span role="img" aria-label="Plus sign">
          ➕
        </span>
        Add your first passage
      </button>
    </div>
  );
}

export default App;
