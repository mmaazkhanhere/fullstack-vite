// src/App.jsx
import { useState } from "react";
import CustomerApp from "./CustomerApp";
import AgentApp from "./AgentApp";

export default function App() {
  const [isAgent, setIsAgent] = useState(false);

  return (
    <div>
      <div className="role-selector">
        <button onClick={() => setIsAgent(false)}>Customer View</button>
        <button onClick={() => setIsAgent(true)}>Agent View</button>
      </div>

      {isAgent ? <AgentApp /> : <CustomerApp />}
    </div>
  );
}
