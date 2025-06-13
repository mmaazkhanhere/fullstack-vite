// src/AgentApp.jsx
import { useState, useEffect } from "react";

export default function AgentApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(true);

  // Poll for new messages every second
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      fetch("http://localhost:8080/messages?sender=agent")
        .then((res) => res.json())
        .then((data) => setMessages(data))
        .catch(() => setIsConnected(false));
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const sendMessage = () => {
    if (!input.trim()) return;

    fetch("http://localhost:8080/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: "agent", text: input }),
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

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message">
            <span className="sender">Customer:</span> {msg.text}
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
