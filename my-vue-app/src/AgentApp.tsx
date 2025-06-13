// src/AgentApp.jsx
import { useState, useEffect } from "react";

export default function AgentApp() {
  const [chatData, setChatData] = useState({
    messages: [],
    chatState: { flow: -1, flowStepID: -1, UI_state: "TEXT_INPUT" },
    isAIResponse: true,
    isAgentAvailable: false,
  });
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(true);

  // Poll for new messages every second
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      fetch("http://localhost:8080/messages?role=agent")
        .then((res) => res.json())
        .then((data) => setChatData(data))
        .catch(() => setIsConnected(false));
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMessage = {
      content: input,
      role: "system",
      is_in_flow: false,
    };

    fetch("http://localhost:8080/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMessage),
    })
      .then(() => setInput(""))
      .catch(() => setIsConnected(false));
  };

  return (
    <div className="chat-container">
      <h1>Agent Chat</h1>
      {!isConnected && (
        <div className="error">Connection lost. Try refreshing.</div>
      )}
      {!chatData.isAgentAvailable && (
        <div className="warning">No agents available</div>
      )}

      <div className="messages">
        {chatData.messages.map((msg, i) => (
          <div key={i} className="message">
            <span className="sender">
              {msg.role === "user" ? "Customer:" : "You:"}
            </span>
            {msg.content}
          </div>
        ))}
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your response..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
