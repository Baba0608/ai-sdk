"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect } from "react";
import { Plus, MessageSquare, Trash2, Menu, X } from "lucide-react";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { messages, sendMessage } = useChat({
    onFinish: async (message) => {
      // Refresh conversations after a new message
      await fetchConversations();
    },
  });

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const newConversation = await response.json();
      setCurrentConversationId(newConversation.id);
      setConversations([newConversation, ...conversations]);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });
      setConversations(conversations.filter((c) => c.id !== conversationId));
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`
      );
      const messages = await response.json();
      // Note: This would need to be handled by the useChat hook
      // For now, we'll just set the conversation ID
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Create a new conversation if none exists
    if (!currentConversationId) {
      await createNewConversation();
    }

    setIsLoading(true);
    await sendMessage({ text: input });
    setInput("");
    setIsLoading(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 bg-gray-900 dark:bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-3 px-3 py-2 text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Plus size={20} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                currentConversationId === conversation.id
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
              onClick={() => loadConversation(conversation.id)}
            >
              <MessageSquare size={16} />
              <span className="flex-1 truncate text-sm">
                {conversation.title || "New Chat"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conversation.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            AI Assistant
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  How can I help you today?
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Start a conversation by typing a message below.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-3xl px-4 py-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className="whitespace-pre-wrap"
                          >
                            {part.text}
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="max-w-3xl px-4 py-3 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">●</div>
                  <div className="animate-pulse">●</div>
                  <div className="animate-pulse">●</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              value={input}
              placeholder="Type your message..."
              onChange={(e) => setInput(e.currentTarget.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
