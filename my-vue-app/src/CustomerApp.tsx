import React, { useEffect, useState, useRef } from "react";

const CustomerApp = () => {
  const [chatData, setChatData] = useState({
    messages: [],
    chatState: { flow: -1, flowStepID: -1, UI_state: "TEXT_INPUT" },
    isAIResponse: true,
    isAgentAvailable: true,
  });
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isInFlow, setIsInFlow] = useState(false);
  const [initialButtonsClicked, setInitialButtonsClicked] = useState(false);
  const chatContainerRef = useRef(null);
  const [isAIResponse, setIsAIResponse] = useState(true);
  const isAIResponseRef = useRef(isAIResponse);

  // Keep ref in sync with state
  useEffect(() => {
    isAIResponseRef.current = isAIResponse;
  }, [isAIResponse]);

  // Fetch initial chat setup
  useEffect(() => {
    const fetchInitialChat = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8080/chat/intro", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: "my-page-url" }),
        });
        const data = await response.json();

        setChatData({
          ...chatData,
          messages: [
            {
              role: "system",
              content: data.long,
              options: data.options,
            },
          ],
          chatState: data.chatState || chatData.chatState,
        });
      } catch (error) {
        console.error("Error fetching initial chat:", error);
        setChatData({
          ...chatData,
          messages: [
            {
              role: "system",
              content:
                "Sorry, there was an error connecting to the chat service.",
            },
          ],
        });
      }
    };

    fetchInitialChat();
  }, []);

  // Poll for new messages when in agent mode
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const fetchMessages = async () => {
      try {
        const response = await fetch(
          "http://localhost:8080/messages?role=customer"
        );
        if (!response.ok) throw new Error("Failed to fetch messages");

        const data = await response.json();
        setChatData(data);
      } catch (error) {
        console.error("Polling error:", error);
        setIsConnected(false);
      }
    };

    if (!isAIResponse) {
      // Fetch immediately when switching to agent mode
      fetchMessages();
      // Then set up polling
      intervalId = setInterval(fetchMessages, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAIResponse]); // Run effect when isAIResponse changes

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatData.messages]);

  const canSendMessage = () => {
    return !(
      chatData.chatState.flow !== -1 &&
      chatData.chatState.UI_state !== "TEXT_INPUT"
    );
  };

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    // Add user message optimistically
    const userMessage = {
      role: "user",
      content: messageContent.trim(),
    };

    setChatData((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }));

    setNewMessage("");
    setIsLoading(true);

    try {
      if (isAIResponse) {
        // AI CHAT MODE
        const response = await fetch("http://127.0.0.1:8080/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...chatData.messages, userMessage],
            url: "",
            chatState: chatData.chatState,
            initialButtonsClicked: initialButtonsClicked,
          }),
        });

        const data = await response.json();
        setChatData(data);
        setIsAIResponse(data.isAIResponse);
        setInitialButtonsClicked(true);

        // If switching to agent mode, send message to agent
        if (!data.isAIResponse) {
          await fetch("http://localhost:8080/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userMessage),
          });
        }
      } else {
        // AGENT MODE - Send to agent endpoint
        await fetch("http://localhost:8080/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userMessage),
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setChatData((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            role: "system",
            content: "Failed to send message. Please try again.",
          },
        ],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const cancelFlow = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8080/chat/cancel_flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      setChatData((prev) => ({
        ...prev,
        messages: [...prev.messages, ...data.messages],
        chatState: data.chatState,
      }));
      setIsInFlow(false);
    } catch (error) {
      console.error("Error canceling the flow:", error);
      setChatData((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            role: "system",
            content:
              "An error occurred while canceling the flow. Please try again.",
          },
        ],
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendMessage()) return;
    sendMessage(newMessage);
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 bg-gray-50">
      {/* Connection status */}
      {!isConnected && (
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded-md mb-4 text-center">
          <i className="fas fa-exclamation-circle mr-2"></i>
          Connection lost. Try refreshing.
        </div>
      )}

      {/* Agent status */}
      {!isAIResponse && (
        <div className="bg-blue-100 text-blue-800 p-3 rounded-md mb-4 text-center">
          <i className="fas fa-user-headset mr-2"></i>
          You're now chatting with a live agent
        </div>
      )}

      {/* Chat header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg">
        <h1 className="text-xl font-bold">Customer Support Chat</h1>
      </div>

      {/* Chat area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-white border border-gray-200"
      >
        {chatData.messages.map((message, index) => (
          <div
            key={index}
            className={`mb-6 ${
              message.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <div className="flex items-end gap-2">
              {message.role !== "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {message.role === "system" ? (
                    <i className="fas fa-user-headset text-blue-600"></i>
                  ) : (
                    <i className="fas fa-robot text-gray-600"></i>
                  )}
                </div>
              )}

              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">
                  {message.role === "user"
                    ? "You"
                    : message.role === "system"
                    ? "Agent"
                    : "Assistant"}
                </div>
                <div
                  className={`inline-block rounded-2xl p-4 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : message.role === "system"
                      ? "bg-green-100 text-gray-800" // Agent messages
                      : "bg-gray-100 text-gray-800" // AI messages
                  }`}
                >
                  {message.content}

                  {/* Display message options if available */}
                  {message.options && message.role === "assistant" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.options.map((option, idx) => (
                        <button
                          key={idx}
                          className="px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-full text-sm hover:bg-blue-50 transition-all"
                          onClick={() => sendMessage(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-user text-blue-600"></i>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Special UI states */}
        {chatData.chatState.UI_state === "YES_NO" && (
          <div className="flex justify-center gap-x-3 mt-4">
            <button
              className="px-4 py-2.5 flex items-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition shadow-md"
              onClick={() => sendMessage("Yes")}
            >
              <i className="fas fa-check mr-2"></i> Yes
            </button>
            <button
              className="px-4 py-2.5 flex items-center bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition"
              onClick={() => sendMessage("No")}
            >
              <i className="fas fa-times mr-2"></i> No
            </button>
          </div>
        )}

        {chatData.chatState.UI_state === "MULTI_CHOICE" &&
          chatData.messages.length > 0 &&
          chatData.messages[chatData.messages.length - 1]?.options && (
            <div className="flex flex-wrap gap-3 justify-center p-2 mt-4">
              {chatData.messages[chatData.messages.length - 1].options.map(
                (option, idx) => (
                  <button
                    key={idx}
                    className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition shadow-md"
                    onClick={() => sendMessage(option)}
                  >
                    {option}
                  </button>
                )
              )}
            </div>
          )}

        {chatData.chatState.UI_state === "DROP_DOWN" &&
          chatData.messages.length > 0 &&
          chatData.messages[chatData.messages.length - 1]?.select && (
            <div className="flex justify-center p-4 mt-4">
              <select
                className="border border-gray-300 rounded-full px-4 py-2.5 w-full max-w-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => e.target.value && sendMessage(e.target.value)}
              >
                <option value="">Select an option</option>
                {chatData.messages[chatData.messages.length - 1].select.map(
                  (option, idx) => (
                    <option key={idx} value={option}>
                      {option}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              {isAIResponse ? (
                <i className="fas fa-robot text-gray-600"></i>
              ) : (
                <i className="fas fa-user-headset text-green-600"></i>
              )}
            </div>
            <div className="bg-gray-100 rounded-2xl p-4 text-gray-800 max-w-[50%]">
              <div className="flex items-center">
                <div className="flex space-x-1">
                  <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
                <span className="ml-3 text-sm">
                  {isAIResponse ? "Thinking..." : "Agent is typing..."}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="py-3 flex justify-between">
        <div className="flex gap-2">
          {isInFlow && (
            <button
              onClick={cancelFlow}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition flex items-center"
            >
              <i className="fas fa-times mr-2"></i>
              Cancel Flow
            </button>
          )}
        </div>
        <div>
          {isAIResponse && (
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
              onClick={() => setIsAIResponse(false)}
            >
              <i className="fas fa-user-headset mr-2"></i>
              Request Live Agent
            </button>
          )}
        </div>
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="mt-2 flex gap-3 items-center border-t border-gray-200 pt-4"
      >
        <div className="flex-1 relative">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full resize-none rounded-2xl border border-gray-300 p-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            rows={1}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="absolute right-3 bottom-3 flex gap-2">
            <button type="button" className="text-gray-400 hover:text-gray-600">
              <i className="fas fa-paperclip"></i>
            </button>
            <button type="button" className="text-gray-400 hover:text-gray-600">
              <i className="far fa-smile"></i>
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !canSendMessage()}
          className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition shadow-md"
        >
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
};

export default CustomerApp;
