import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiMessageCircle,
  FiSend,
} from "react-icons/fi";
import api from "../services/api";
import "./Messages.css";

const Messages = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const currentUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const getInitial = (username) =>
    username?.charAt(0).toUpperCase() || "?";

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get("/messages");
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.log(
        error.response?.data?.message ||
          "Failed to load conversations"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchConversation = async (userId) => {
    try {
      setChatLoading(true);
      setError("");
      const response = await api.get(`/messages/${userId}`);
      setSelectedUser(response.data.user);
      setMessages(response.data.messages || []);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.user._id === userId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      );
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load conversation"
      );
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userId = params.get("user");

    if (userId) {
      fetchConversation(userId);
    } else {
      setSelectedUser(null);
      setMessages([]);
    }
  }, [location.search]);

  const handleSelectConversation = (userId) => {
    navigate(`/messages?user=${userId}`);
  };

  const handleBack = () => {
    navigate("/messages");
    setSelectedUser(null);
    setMessages([]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messageText = text.trim();

    if (!messageText || !selectedUser || sending) return;

    try {
      setSending(true);
      setError("");

      const response = await api.post(
        `/messages/${selectedUser._id}`,
        { text: messageText }
      );

      setMessages((previous) => [
        ...previous,
        response.data.data,
      ]);
      setText("");
      await fetchConversations();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  };

  const handleSharedPostClick = (postId) => {
    if (!postId) return;
    console.log("Shared post:", postId);
  };

  const handleSharedReelClick = () => {
    navigate("/reels");
  };

  const renderAvatar = (user, className = "chat-avatar") => {
    if (user?.profileImage) {
      return (
        <img
          src={user.profileImage}
          alt={user.username || "User"}
          className={className}
        />
      );
    }

    return (
      <div
        className={
          className === "conversation-avatar"
            ? "conversation-placeholder"
            : "chat-placeholder"
        }
      >
        {getInitial(user?.username)}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="messages-loading">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="messages-page">
      <div className="messages-container">
        <aside
          className={`conversations-sidebar ${
            selectedUser ? "hide-on-mobile" : ""
          }`}
        >
          <div className="messages-title">
            <h2>Messages</h2>
          </div>

          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="no-conversations">
                <FiMessageCircle />
                <p>No messages yet</p>
                <span>
                  Start a conversation with someone
                  to see your messages here.
                </span>
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.user._id}
                  className={`conversation-item ${
                    selectedUser?._id ===
                    conversation.user._id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleSelectConversation(
                      conversation.user._id
                    )
                  }
                >
                  {renderAvatar(
                    conversation.user,
                    "conversation-avatar"
                  )}

                  <div className="conversation-info">
                    <strong>
                      {conversation.user.username}
                    </strong>
                    <span>
                      {conversation.lastMessage?.text ||
                        "Start a conversation"}
                    </span>
                  </div>

                  {conversation.unreadCount > 0 && (
                    <span className="unread-count">
                      {conversation.unreadCount > 99
                        ? "99+"
                        : conversation.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        <section
          className={`chat-section ${
            !selectedUser ? "hide-on-mobile" : ""
          }`}
        >
          {!selectedUser ? (
            <div className="empty-chat">
              <FiMessageCircle />
              <h3>Your Messages</h3>
              <p>
                Select a conversation to start
                messaging.
              </p>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <button
                  className="back-button"
                  onClick={handleBack}
                  aria-label="Back"
                >
                  <FiArrowLeft />
                </button>
                {renderAvatar(selectedUser)}
                <strong>{selectedUser.username}</strong>
              </div>

              {chatLoading ? (
                <div className="chat-loading">
                  Loading conversation...
                </div>
              ) : (
                <div className="messages-list">
                  {messages.length === 0 ? (
                    <div className="no-messages">
                      <span>
                        No messages yet. Say hello!
                      </span>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const senderId =
                        message.sender?._id ||
                        message.sender;
                      const currentUserId =
                        currentUser?._id ||
                        currentUser?.id;

                      const isOwnMessage =
                        senderId?.toString() ===
                        currentUserId?.toString();

                      const isSharedPost =
                        !!(
                          message.postImage ||
                          message.post?.image
                        );

                      const isStoryReply =
                        !!message.storyImage;

                      const reel =
                        message.reel &&
                        typeof message.reel === "object"
                          ? message.reel
                          : null;

                      const reelVideo = reel?.video;

                      return (
                        <div
                          key={message._id}
                          className={`message-row ${
                            isOwnMessage
                              ? "own"
                              : "received"
                          }`}
                        >
                          <div className="message-bubble">
                            {isSharedPost && (
                              <div
                                className="shared-post-preview"
                                onClick={() =>
                                  handleSharedPostClick(
                                    message.post?._id ||
                                      message.post
                                  )
                                }
                              >
                                <div className="shared-post-label">
                                  Shared a post
                                </div>
                                <img
                                  src={
                                    message.postImage ||
                                    message.post?.image
                                  }
                                  alt="Shared post"
                                  className="shared-post-image"
                                />
                                {(message.postCaption ||
                                  message.post?.caption) && (
                                  <p className="shared-post-caption">
                                    {message.postCaption ||
                                      message.post?.caption}
                                  </p>
                                )}
                              </div>
                            )}

                            {isStoryReply && (
                              <div className="story-reply-preview">
                                <div className="story-reply-label">
                                  Replied to your story
                                </div>
                                <img
                                  src={message.storyImage}
                                  alt="Story"
                                  className="story-reply-image"
                                />
                              </div>
                            )}

                            {reel && (
                              <div className="shared-reel-preview">
                                <div className="shared-reel-label">
                                  ▶ Shared a reel
                                </div>

                                {reelVideo ? (
                                  <video
                                    className="shared-reel-video"
                                    src={reelVideo}
                                    controls
                                    playsInline
                                    preload="metadata"
                                  />
                                ) : (
                                  <div className="shared-reel-unavailable">
                                    Reel preview unavailable
                                  </div>
                                )}

                                {reel.caption && (
                                  <p className="shared-reel-caption">
                                    {reel.caption}
                                  </p>
                                )}

                                {reel.user?.username && (
                                  <span className="shared-reel-creator">
                                    @{reel.user.username}
                                  </span>
                                )}

                                <button
                                  type="button"
                                  className="shared-reel-open"
                                  onClick={handleSharedReelClick}
                                >
                                  View Reels
                                </button>
                              </div>
                            )}

                            {message.text &&
                              !reel &&
                              !isSharedPost &&
                              !isStoryReply && (
                                <p>{message.text}</p>
                              )}

                            {(reel ||
                              isSharedPost ||
                              isStoryReply) &&
                              message.text &&
                              message.text !== "Shared a reel" && (
                                <p>{message.text}</p>
                              )}

                            <span className="message-time">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {error && (
                <p className="message-error">{error}</p>
              )}

              <form
                className="message-input-form"
                onSubmit={handleSendMessage}
              >
                <input
                  type="text"
                  placeholder="Message..."
                  value={text}
                  onChange={(e) =>
                    setText(e.target.value)
                  }
                  maxLength={1000}
                  disabled={sending}
                />

                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  aria-label="Send message"
                >
                  <FiSend />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Messages;