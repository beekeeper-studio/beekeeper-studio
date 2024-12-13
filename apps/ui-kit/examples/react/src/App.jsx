import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import bksLogo from './assets/bks.svg'
import '@bks/ui-kit/components/SqlTextEditor'
import '@bks/ui-kit/style.css'
import './App.css'

function App() {
  const [text, setText] = useState('select * from users u\nwhere u.id = 1;')
  const [tables, setTables] = useState({
    users: ['id', 'name', 'email'],
    posts: ['id', 'title', 'body'],
    comments: ['id', 'comment', 'post_id', 'user_id'],
  })
  const sqlTextEditorRef = useRef(null)

  useEffect(() => {
    const handleUpdateValue = (event) => {
      const updatedText = event.detail[0];
      if (text === updatedText) return
      setText(updatedText);
    };

    const webComponent = sqlTextEditorRef.current;

    if (webComponent) {
      webComponent.addEventListener("update:value", handleUpdateValue);
    }

    return () => {
      if (webComponent) {
        webComponent.removeEventListener("update:value", handleUpdateValue);
      }
    };
  }, [])

  useEffect(() => {
    sqlTextEditorRef.current.hintOptions = { tables }
  }, [tables])

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a href="https://www.beekeeperstudio.io/" target="_blank">
          <img src={bksLogo} className="logo bks" alt="Beekeeper Studio logo" />
        </a>
      </div>
      <h1>Vite + React + @bks/ui-kit</h1>
      <div className="card">
        <h2>Sql Text Editor</h2>
        <bks-sql-text-editor ref={sqlTextEditorRef} value={text} focus />
        <h2>Table</h2>
        <bks-table />
        <h2>Table List</h2>
        <bks-table-list />
      </div>
    </>
  )
}

export default App
