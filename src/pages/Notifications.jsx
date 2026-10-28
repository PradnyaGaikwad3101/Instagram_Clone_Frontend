
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiHeart,
  FiMessageCircle,
  FiUserPlus,
  FiCheck,
  FiX,
} from "react-icons/fi";
import api from "../services/api";
import "./Notifications.css";

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState([]);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/notifications");
      setNotifications(response.data.notifications || []);
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to load notifications"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (error) {
      console.error(
        error.response?.data?.message || "Failed to mark notification as read"
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (error) {
      console.error(
        error.response?.data?.message || "Failed to mark notifications as read"
      );
    }
  };

  const handleFollowRequest = async (notification, action) => {
    const requesterId = notification.sender?._id;
    if (!requesterId || processingIds.includes(notification._id)) return;

    setProcessingIds((prev) => [...prev, notification._id]);
    setError("");

    try {
      await api.put(`/users/follow-requests/${requesterId}`, { action });

      setNotifications((prev) =>
        prev.filter((item) => item._id !== notification._id)
      );
    } catch (error) {
      setError(
        error.response?.data?.message ||
          `Failed to ${action} follow request`
      );
    } finally {
      setProcessingIds((prev) =>
        prev.filter((id) => id !== notification._id)
      );
    }
  };

  const getNotificationText = (notification) => {
    const username = notification.sender?.username || "Someone";

    if (notification.type === "like") {
      return <><strong>{username}</strong> liked your post.</>;
    }

    if (notification.type === "comment") {
      return <><strong>{username}</strong> commented on your post.</>;
    }

    if (notification.type === "follow") {
      return <><strong>{username}</strong> started following you.</>;
    }

    if (notification.type === "follow_request") {
      return <><strong>{username}</strong> requested to follow you.</>;
    }

    return null;
  };

  const getNotificationIcon = (type) => {
    if (type === "like") return <FiHeart />;
    if (type === "comment") return <FiMessageCircle />;
    return <FiUserPlus />;
  };

  const handleNotificationClick = async (notification) => {
    if (notification.type === "follow_request") {
      if (notification.sender?._id) {
        navigate(`/users/${notification.sender._id}`);
      }
      return;
    }

    if (!notification.read) {
      await markAsRead(notification._id);
    }

    if (
      (notification.type === "like" ||
        notification.type === "comment") &&
      notification.post?._id
    ) {
      navigate("/home");
    } else if (
      notification.type === "follow" &&
      notification.sender?._id
    ) {
      navigate(`/users/${notification.sender._id}`);
    }
  };

  const formatTime = (date) => {
    const notificationDate = new Date(date);
    const difference = Math.floor(
      (Date.now() - notificationDate.getTime()) / 1000
    );

    if (difference < 60) return "Just now";
    if (difference < 3600) return `${Math.floor(difference / 60)}m`;
    if (difference < 86400) return `${Math.floor(difference / 3600)}h`;
    if (difference < 604800) return `${Math.floor(difference / 86400)}d`;

    return notificationDate.toLocaleDateString();
  };

  if (loading) {
    return <div className="notifications-loading">Loading...</div>;
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h2>Notifications</h2>
        {unreadCount > 0 && (
          <button
            className="mark-all-button"
            onClick={markAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      {error && <p className="notification-error">{error}</p>}

      {notifications.length === 0 ? (
        <div className="no-notifications">
          <div className="notification-empty-icon"><FiHeart /></div>
          <h3>No notifications yet</h3>
          <p>When people interact with you, you'll see their activity here.</p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => {
            const isFollowRequest = notification.type === "follow_request";
            const isProcessing = processingIds.includes(notification._id);

            return (
              <div
                key={notification._id}
                className={`notification-item ${
                  !notification.read ? "unread" : ""
                } ${isFollowRequest ? "follow-request-item" : ""}`}
                onClick={() => handleNotificationClick(notification)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleNotificationClick(notification);
                  }
                }}
              >
                {notification.sender?.profileImage ? (
                  <img
                    src={notification.sender.profileImage}
                    alt={notification.sender.username || "User"}
                    className="notification-avatar"
                  />
                ) : (
                  <div className="notification-avatar notification-placeholder">
                    {notification.sender?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}

                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="notification-content">
                  <p>{getNotificationText(notification)}</p>
                  <span>{formatTime(notification.createdAt)}</span>

                  {isFollowRequest && (
                    <div className="follow-request-actions">
                      <button
                        type="button"
                        className="follow-request-accept"
                        disabled={isProcessing}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleFollowRequest(notification, "accept");
                        }}
                      >
                        <FiCheck />
                        {isProcessing ? "Processing..." : "Accept"}
                      </button>

                      <button
                        type="button"
                        className="follow-request-reject"
                        disabled={isProcessing}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleFollowRequest(notification, "reject");
                        }}
                      >
                        <FiX />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {(notification.type === "like" ||
                  notification.type === "comment") &&
                  notification.post?.image && (
                    <img
                      src={notification.post.image}
                      alt="Post"
                      className="notification-post-image"
                    />
                  )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;