"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [input, setInput] = useState("");
  const [newConversationTitle, setNewConversationTitle] = useState("");

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem("conversations");
    if (savedConversations) {
      const parsed = JSON.parse(savedConversations).map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
      setConversations(parsed);
      if (parsed.length > 0 && !selectedConversationId) {
        setSelectedConversationId(parsed[0].id);
      }
    }
  }, []);

  // Save conversations to localStorage whenever conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem("conversations", JSON.stringify(conversations));
    }
  }, [conversations]);

  const selectedConversation = conversations.find(
    (conv) => conv.id === selectedConversationId
  );

  // Helper function to extract text content from UIMessage parts
  const extractTextContent = (message: any): string => {
    if (message.parts && Array.isArray(message.parts)) {
      return message.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("");
    }
    return message.content || "";
  };

  const { messages, sendMessage, status } = useChat({
    onFinish: ({ message }) => {
      if (selectedConversationId) {
        const newMessage: Message = {
          id: message.id,
          role: "assistant",
          content: extractTextContent(message),
          timestamp: new Date(),
        };

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, newMessage],
                  updatedAt: new Date(),
                }
              : conv
          )
        );
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  const createNewConversation = () => {
    const title =
      newConversationTitle.trim() || `Conversation ${conversations.length + 1}`;
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setConversations((prev) => [newConversation, ...prev]);
    setSelectedConversationId(newConversation.id);
    setNewConversationTitle("");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedConversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    // Add user message to conversation
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              updatedAt: new Date(),
            }
          : conv
      )
    );

    // Send message to AI
    await sendMessage({ text: input });
    setInput("");
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Chat Conversations
          </h1>
        </div>

        {/* New Conversation */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New conversation title..."
              value={newConversationTitle}
              onChange={(e) => setNewConversationTitle(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              onKeyPress={(e) => e.key === "Enter" && createNewConversation()}
            />
            <button
              onClick={createNewConversation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              New
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversationId(conversation.id)}
              className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                selectedConversationId === conversation.id
                  ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                  : ""
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                {conversation.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {conversation.messages.length} messages •{" "}
                {formatDate(conversation.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedConversation.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Created {formatDate(selectedConversation.createdAt)}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div
                      className={`text-xs mt-1 ${
                        message.role === "user"
                          ? "text-blue-100"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {formatDate(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg">
                    <div className="text-sm">AI is typing...</div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No conversation selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Create a new conversation or select an existing one to start
                chatting.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
