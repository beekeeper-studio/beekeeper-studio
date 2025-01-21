import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import bksLogo from "./assets/bks.svg";
import Components from "./Components";
import "./App.css";

function App() {
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
      <Components />
    </>
  );
}

export default App;
