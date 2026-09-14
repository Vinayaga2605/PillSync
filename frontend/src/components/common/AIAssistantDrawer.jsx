import {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bot,
  Send,
  X,
  Sparkles,
  Move,
} from "lucide-react";

import { AuthContext } from "../../context/AuthContext";
import { sendAssistantMessage } from "../../services/api";

const DEFAULT_CHIPS = {
  patient: [
    "What medicines do I have?",
    "Show my schedule",
    "Any missed doses?",
  ],
  caregiver: [
    "List assigned patients",
    "Any missed dose alerts?",
    "Show medicine status",
  ],
  admin: [
    "Give me a system status",
    "How many patients are registered?",
    "Show medicine statistics",
  ],
};

const getTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const getDefaultPosition = () => {
  if (typeof window === "undefined") {
    return {
      x: 24,
      y: 24,
    };
  }

  return {
    x: Math.max(
      16,
      window.innerWidth - 190
    ),
    y: Math.max(
      16,
      window.innerHeight - 80
    ),
  };
};

const getSavedPosition = () => {
  try {
    const saved = localStorage.getItem(
      "pillsync-ai-position"
    );

    if (!saved) {
      return getDefaultPosition();
    }

    const parsed = JSON.parse(saved);

    if (
      typeof parsed?.x !== "number" ||
      typeof parsed?.y !== "number"
    ) {
      return getDefaultPosition();
    }

    return parsed;
  } catch {
    return getDefaultPosition();
  }
};

const AIAssistantDrawer = () => {
  const { user } = useContext(AuthContext);

  const role = (
    user?.role ||
    "patient"
  ).toLowerCase();

  const firstName =
    user?.full_name?.split(" ")[0] ||
    user?.username ||
    "there";

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      sender: "assistant",
      text: `Hello ${firstName}! I'm your PillSync AI Assistant. How can I help you today?`,
      time: getTime(),
    },
  ]);

  const [suggestions, setSuggestions] = useState(
    DEFAULT_CHIPS[role] ||
      DEFAULT_CHIPS.patient
  );

  const [position, setPosition] = useState(
    getSavedPosition
  );

  const [isDragging, setIsDragging] =
    useState(false);

  const messagesEndRef = useRef(null);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
  });

  const movedRef = useRef(false);
  const dragStartedRef = useRef(false);

  useEffect(() => {
    setSuggestions(
      DEFAULT_CHIPS[role] ||
        DEFAULT_CHIPS.patient
    );
  }, [role]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "pillsync-ai-position",
        JSON.stringify(position)
      );
    } catch {
      // Ignore localStorage errors.
    }
  }, [position]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => {
        const buttonWidth = 175;
        const buttonHeight = 48;

        const maxX = Math.max(
          8,
          window.innerWidth -
            buttonWidth -
            8
        );

        const maxY = Math.max(
          8,
          window.innerHeight -
            buttonHeight -
            8
        );

        const x = Math.max(
          8,
          Math.min(current.x, maxX)
        );

        const y = Math.max(
          8,
          Math.min(current.y, maxY)
        );

        if (
          x === current.x &&
          y === current.y
        ) {
          return current;
        }

        return {
          x,
          y,
        };
      });
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        handleResize
      );
  }, []);

  const handleSend = async (
    textToSend = ""
  ) => {
    const query = (
      textToSend || input
    ).trim();

    if (!query || loading) {
      return;
    }

    const userMessage = {
      sender: "user",
      text: query,
      time: getTime(),
    };

    const historyPayload = messages
      .slice(-6)
      .map((message) => ({
        sender: message.sender,
        message: message.text,
        pending_intent:
          message.pending_intent,
      }));

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      const response =
        await sendAssistantMessage(
          query,
          historyPayload
        );

      const assistantMessage = {
        sender: "assistant",
        text:
          response.reply ||
          "I couldn't generate a response.",
        time: getTime(),
        pending_intent:
          response.pending_intent,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);

      if (
        Array.isArray(response.suggestions) &&
        response.suggestions.length > 0
      ) {
        setSuggestions(response.suggestions);
      } else {
        setSuggestions(
          DEFAULT_CHIPS[role] ||
            DEFAULT_CHIPS.patient
        );
      }

      if (
        response.action_executed ===
        "REFRESH_SCHEDULE"
      ) {
        window.dispatchEvent(
          new Event(
            "pillsync-schedule-updated"
          )
        );
      }

      if (
        response.action_executed ===
        "REFRESH_MEDICINES"
      ) {
        window.dispatchEvent(
          new Event(
            "pillsync-medicines-updated"
          )
        );
      }
    } catch (error) {
      const backendMessage =
        error.response?.data?.reply ||
        error.response?.data?.error ||
        error.message ||
        "Could not process your request.";

      setMessages((previous) => [
        ...previous,
        {
          sender: "assistant",
          text: `Error: ${backendMessage}`,
          time: getTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) {
      return;
    }

    dragStartedRef.current = true;
    movedRef.current = false;

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: position.x,
      startTop: position.y,
    };

    try {
      event.currentTarget.setPointerCapture(
        event.pointerId
      );
    } catch {
      // Ignore unsupported pointer capture.
    }
  };

  const handlePointerMove = (event) => {
    if (!dragStartedRef.current) {
      return;
    }

    const dx =
      event.clientX -
      dragRef.current.startX;

    const dy =
      event.clientY -
      dragRef.current.startY;

    if (
      Math.abs(dx) > 4 ||
      Math.abs(dy) > 4
    ) {
      movedRef.current = true;
      setIsDragging(true);
    }

    if (!movedRef.current) {
      return;
    }

    const buttonWidth = 175;
    const buttonHeight = 48;

    const maxX = Math.max(
      8,
      window.innerWidth -
        buttonWidth -
        8
    );

    const maxY = Math.max(
      8,
      window.innerHeight -
        buttonHeight -
        8
    );

    const nextX = Math.max(
      8,
      Math.min(
        dragRef.current.startLeft + dx,
        maxX
      )
    );

    const nextY = Math.max(
      8,
      Math.min(
        dragRef.current.startTop + dy,
        maxY
      )
    );

    setPosition({
      x: nextX,
      y: nextY,
    });
  };

  const handlePointerUp = (event) => {
    dragStartedRef.current = false;
    setIsDragging(false);

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    } catch {
      // Ignore unsupported pointer capture.
    }

    if (movedRef.current) {
      setTimeout(() => {
        movedRef.current = false;
      }, 0);
    }
  };

  const handleFabClick = () => {
    if (movedRef.current) {
      return;
    }

    setIsOpen((open) => !open);
  };

  const getDrawerPosition = () => {
    const drawerWidth = Math.min(
      390,
      Math.max(
        300,
        window.innerWidth - 32
      )
    );

    const drawerHeight = Math.min(
      620,
      Math.max(
        400,
        window.innerHeight - 120
      )
    );

    let left = position.x;
    let top =
      position.y -
      drawerHeight -
      14;

    if (
      top < 12
    ) {
      top =
        position.y + 58;
    }

    if (
      left + drawerWidth >
      window.innerWidth - 12
    ) {
      left =
        window.innerWidth -
        drawerWidth -
        12;
    }

    if (left < 12) {
      left = 12;
    }

    if (
      top + drawerHeight >
      window.innerHeight - 12
    ) {
      top =
        window.innerHeight -
        drawerHeight -
        12;
    }

    if (top < 12) {
      top = 12;
    }

    return {
      left,
      top,
    };
  };

  const drawerPosition =
    getDrawerPosition();

  return (
    <>
      <style>{`
        .ai-assistant-fab {
          position: fixed;
          left: 0;
          top: 0;
          z-index: 1100;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          width: 175px;
          height: 48px;
          padding: 0 16px;
          border: 0;
          border-radius: 999px;
          background: #172033;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: grab;
          user-select: none;
          touch-action: none;
          box-shadow:
            0 10px 30px rgba(23, 32, 51, 0.22);
          transition:
            box-shadow 0.2s ease,
            transform 0.2s ease;
        }

        .ai-assistant-fab.is-dragging {
          cursor: grabbing;
          transform: scale(1.03);
          box-shadow:
            0 16px 38px rgba(23, 32, 51, 0.3);
        }

        .ai-assistant-fab:not(.is-dragging):hover {
          transform: translateY(-2px);
          box-shadow:
            0 14px 34px rgba(23, 32, 51, 0.28);
        }

        .ai-assistant-fab__drag {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8ea0b4;
        }

        .ai-assistant-fab__icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-assistant-fab__text {
          flex: 1;
          text-align: left;
          white-space: nowrap;
        }

        .ai-assistant-fab__badge {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 50%;
          background: #14b8a6;
          box-shadow:
            0 0 0 4px rgba(20, 184, 166, 0.14);
        }

        .ai-drawer {
          position: fixed;
          z-index: 1099;
          width: min(390px, calc(100vw - 32px));
          height: min(620px, calc(100vh - 120px));
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e7edf3;
          border-radius: 22px;
          box-shadow:
            0 24px 70px rgba(23, 32, 51, 0.22);
        }

        .ai-drawer__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 18px 16px;
          background: #f8fbfc;
          border-bottom: 1px solid #edf1f4;
        }

        .ai-drawer__brand {
          display: flex;
          align-items: flex-start;
          gap: 11px;
        }

        .ai-drawer__brand-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #e6faf7;
          color: #0f9f91;
        }

        .ai-drawer__title-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ai-drawer__title {
          margin: 0;
          color: #172033;
          font-size: 16px;
          font-weight: 800;
        }

        .ai-drawer__mode {
          padding: 4px 8px;
          border-radius: 999px;
          background: #172033;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .ai-drawer__subtitle {
          margin: 4px 0 0;
          color: #7a8797;
          font-size: 12px;
        }

        .ai-drawer__close {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 10px;
          background: #ffffff;
          color: #687587;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .ai-drawer__close:hover {
          background: #eef3f6;
          color: #172033;
        }

        .ai-drawer__messages {
          flex: 1;
          overflow-y: auto;
          padding: 18px;
          background: #f5f8fb;
        }

        .ai-msg {
          display: flex;
          flex-direction: column;
          margin-bottom: 14px;
        }

        .ai-msg--user {
          align-items: flex-end;
        }

        .ai-msg--assistant {
          align-items: flex-start;
        }

        .ai-msg__bubble {
          max-width: 84%;
          padding: 11px 13px;
          border-radius: 15px;
          font-size: 13px;
          line-height: 1.5;
          word-break: break-word;
        }

        .ai-msg--assistant .ai-msg__bubble {
          background: #ffffff;
          color: #334155;
          border: 1px solid #e5ebf0;
          border-top-left-radius: 5px;
        }

        .ai-msg--user .ai-msg__bubble {
          background: #172033;
          color: #ffffff;
          border-top-right-radius: 5px;
        }

        .ai-msg__time {
          margin-top: 4px;
          padding: 0 4px;
          color: #98a3b1;
          font-size: 10px;
        }

        .ai-drawer__suggestions {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          padding: 11px 14px;
          border-top: 1px solid #edf1f4;
          background: #ffffff;
          scrollbar-width: thin;
        }

        .ai-chip {
          flex: 0 0 auto;
          border: 1px solid #d9e6e8;
          border-radius: 999px;
          padding: 7px 11px;
          background: #f8fcfc;
          color: #166b66;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .ai-chip:hover:not(:disabled) {
          background: #eaf9f7;
          border-color: #b9e7e1;
        }

        .ai-chip:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ai-drawer__footer {
          display: flex;
          gap: 8px;
          padding: 12px;
          background: #ffffff;
          border-top: 1px solid #edf1f4;
        }

        .ai-drawer__input {
          flex: 1;
          min-width: 0;
          border: 1px solid #dbe4ea;
          border-radius: 12px;
          padding: 10px 12px;
          outline: none;
          background: #f9fbfc;
          color: #172033;
          font-size: 13px;
        }

        .ai-drawer__input:focus {
          border-color: #6fd3c8;
          box-shadow:
            0 0 0 3px rgba(20, 184, 166, 0.1);
        }

        .ai-drawer__send {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 12px;
          background: #14b8a6;
          color: #ffffff;
          cursor: pointer;
          flex-shrink: 0;
        }

        .ai-drawer__send:hover:not(:disabled) {
          background: #0f9f91;
        }

        .ai-drawer__send:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .ai-thinking {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #718096;
          font-style: italic;
        }

        @media (max-width: 640px) {
          .ai-assistant-fab {
            width: 160px;
            height: 46px;
          }

          .ai-drawer {
            width: calc(100vw - 24px);
            height: calc(100vh - 92px);
            border-radius: 18px;
          }
        }
      `}</style>

      <button
        type="button"
        className={`ai-assistant-fab ${
          isDragging ? "is-dragging" : ""
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleFabClick}
        aria-label={
          isOpen
            ? "Close AI Assistant"
            : "Open AI Assistant"
        }
        title="Drag to move"
      >
        <span className="ai-assistant-fab__drag">
          <Move size={13} />
        </span>

        <span className="ai-assistant-fab__icon">
          <Bot size={18} />
        </span>

        <span className="ai-assistant-fab__text">
          AI Assistant
        </span>

        <span className="ai-assistant-fab__badge" />
      </button>

      {isOpen && (
        <div
          className="ai-drawer"
          style={{
            left: `${drawerPosition.left}px`,
            top: `${drawerPosition.top}px`,
          }}
        >
          <div className="ai-drawer__header">
            <div className="ai-drawer__brand">
              <div className="ai-drawer__brand-icon">
                <Sparkles size={19} />
              </div>

              <div>
                <div className="ai-drawer__title-row">
                  <h2 className="ai-drawer__title">
                    PillSync AI
                  </h2>

                  <span className="ai-drawer__mode">
                    {role} Mode
                  </span>
                </div>

                <p className="ai-drawer__subtitle">
                  Your medication assistant
                </p>
              </div>
            </div>

            <button
              type="button"
              className="ai-drawer__close"
              onClick={() =>
                setIsOpen(false)
              }
              aria-label="Close AI Assistant"
            >
              <X size={18} />
            </button>
          </div>

          <div className="ai-drawer__messages">
            {messages.map(
              (message, index) => (
                <div
                  key={`${message.sender}-${index}`}
                  className={`ai-msg ai-msg--${message.sender}`}
                >
                  <div className="ai-msg__bubble">
                    {message.text
                      .split("\n")
                      .map(
                        (
                          line,
                          lineIndex,
                          lines
                        ) => (
                          <span
                            key={lineIndex}
                          >
                            {line}

                            {lineIndex <
                              lines.length -
                                1 && (
                              <br />
                            )}
                          </span>
                        )
                      )}
                  </div>

                  <span className="ai-msg__time">
                    {message.time}
                  </span>
                </div>
              )
            )}

            {loading && (
              <div className="ai-msg ai-msg--assistant">
                <div className="ai-msg__bubble">
                  <span className="ai-thinking">
                    <Sparkles size={13} />
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {suggestions.length > 0 && (
            <div className="ai-drawer__suggestions">
              {suggestions.map(
                (suggestion, index) => (
                  <button
                    type="button"
                    key={`${suggestion}-${index}`}
                    className="ai-chip"
                    onClick={() =>
                      handleSend(
                        suggestion
                      )
                    }
                    disabled={loading}
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          )}

          <form
            className="ai-drawer__footer"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              className="ai-drawer__input"
              placeholder={`Ask AI (${role} mode)...`}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              disabled={loading}
            />

            <button
              type="submit"
              className="ai-drawer__send"
              disabled={
                loading ||
                !input.trim()
              }
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIAssistantDrawer;
