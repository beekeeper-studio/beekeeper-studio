import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import bksLogo from './assets/bks.svg'
import '@bks/ui-kit/components/SqlTextEditor'
import '@bks/ui-kit/components/Table'
import '@bks/ui-kit/style.css'
import './App.css'

function App() {
  const [text, setText] = useState('select * from users u\nwhere u.id = 1;')
  const [tables, setTables] = useState({
    users: ['id', 'name', 'email'],
    posts: ['id', 'title', 'body'],
    comments: ['id', 'comment', 'post_id', 'user_id'],
  })
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "Edgar Miller",
      email: "Hortense_Halvorson57@yahoo.com",
    },
    { id: 2, name: "Roosevelt Murphy", email: "Nelson_Roob86@yahoo.com" },
    {
      id: 3,
      name: "Jeannie Schmeler PhD",
      email: "Dominique_Steuber@yahoo.com",
    },
    { id: 4, name: "Rhonda Pfeffer", email: "Jamir31@gmail.com" },
    { id: 5, name: "Dean Larson", email: "Lilly.OKon75@gmail.com" },
    {
      id: 6,
      name: "Brad Prosacco",
      email: "Alexzander.Reynolds@hotmail.com",
    },
    { id: 7, name: "Winston Leffler", email: "Alec36@yahoo.com" },
    {
      id: 8,
      name: "Miss Annie Effertz",
      email: "Laurel_Homenick@gmail.com",
    },
    {
      id: 9,
      name: "Miss Mamie Predovic",
      email: "Hildegard.Murazik7@hotmail.com",
    },
    { id: 10, name: "Raquel Turner", email: "Brain0@hotmail.com" },
  ])
  const sqlTextEditorRef = useRef(null)
  const tableRef = useRef(null)

  // Sql Text Editor
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

  useEffect(() => {
    const columns = [
      { field: 'id', title: 'ID' },
      { field: 'name', title: 'Name', editable: true },
      { field: 'email', title: 'Email', editable: true },
    ]
    tableRef.current.columns = columns
    tableRef.current.data = users
  }, [users])

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
        <bks-table ref={tableRef} table="users" />
        <h2>Table List</h2>
        <bks-table-list />
      </div>
    </>
  )
}

export default App
