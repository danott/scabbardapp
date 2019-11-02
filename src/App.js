import React from "react";
import useLocalStorage from "./hooks/useLocalStorage";

import "./App.css";

function App() {
  const [passages, setPassages] = useLocalStorage("passages", []);
  const [selected, setSelected] = useLocalStorage("selected", null)

  function searchForPassage(passage) {
    const q = prompt("Search for a passage");
    if (q) {
      fetch(`/.netlify/functions/search?q=${q}`)
        .then(r => r.json())
        .then(payload => {
          console.log("appendPassage", payload);
          setPassages([...passages, ...payload.passages]);
        })
        .catch(error => {
          console.log(error);
          alert("Something went wrong");
        });
    }
  }

  const enriched = passages.map(p => {
    let [title, ...passage] = p.split("\n");
    passage = passage.join("\n");

    return { title, passage };
  });


  return (
    <div className="App">
      <button onClick={searchForPassage}>➕Add passage</button>
      {passages.length === 0 ? (
        <div>There are no passages</div>
      ) : (
        <ul>
          {enriched.map(({ title }) => (
            <li key={title}>{title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
