import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiHeart,
  FiMessageCircle,
  FiVolume2,
  FiVolumeX,
  FiPlay,
  FiRefreshCw,
  FiTrash2,
  FiSend,
  FiArrowLeft,
  FiX,
  FiPlus,
  FiShare2,
  FiSearch,
  FiCheck,
  FiBookmark,
} from "react-icons/fi";
import api from "../services/api";
import "./Reels.css";

const getId = (value) => {
  if (!value) return "";
  return String(typeof value === "object" ? value._id || value.id || "" : value);
};

const Reels = () => {
  const navigate = useNavigate();
  const videoRefs = useRef({});
  const observerRef = useRef(null);

  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [pausedReels, setPausedReels] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentLoading, setCommentLoading] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
  const [activeComments, setActiveComments] = useState(null);

  const [shareReelData, setShareReelData] = useState(null);
  const [shareSearch, setShareSearch] = useState("");
  const [shareUsers, setShareUsers] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [sharingUserId, setSharingUserId] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUserId = getId(currentUser);

  const fetchReels = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/reels");
      setReels(response.data.reels || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load reels.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          const reelId = video.dataset.reelId;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
            Object.entries(videoRefs.current).forEach(([id, otherVideo]) => {
              if (otherVideo && id !== reelId) otherVideo.pause();
            });

            if (!pausedReels[reelId]) video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: [0, 0.65, 1] }
    );

    observerRef.current = observer;

    Object.values(videoRefs.current).forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [reels, pausedReels]);

  const toggleLike = async (reelId) => {
    const reel = reels.find((item) => getId(item._id) === reelId);
    if (!reel) return;

    const alreadyLiked = (reel.likes || []).some(
      (user) => getId(user) === currentUserId
    );

    setReels((previous) =>
      previous.map((item) =>
        getId(item._id) === reelId
          ? {
              ...item,
              likes: alreadyLiked
                ? (item.likes || []).filter(
                    (user) => getId(user) !== currentUserId
                  )
                : [...(item.likes || []), currentUser],
            }
          : item
      )
    );

    try {
      const response = await api.put(`/reels/${reelId}/like`);
      setReels((previous) =>
        previous.map((item) =>
          getId(item._id) === reelId
            ? { ...response.data.reel, savedBy: item.savedBy || [] }
            : item
        )
      );
    } catch (err) {
      await fetchReels();
      setError(err.response?.data?.message || "Failed to update like.");
    }
  };

  const toggleSaveReel = async (reelId) => {
    const reel = reels.find((item) => getId(item._id) === reelId);
    if (!reel) return;

    const alreadySaved = (reel.savedBy || []).some(
      (user) => getId(user) === currentUserId
    );

    setReels((previous) =>
      previous.map((item) =>
        getId(item._id) === reelId
          ? {
              ...item,
              savedBy: alreadySaved
                ? (item.savedBy || []).filter(
                    (user) => getId(user) !== currentUserId
                  )
                : [...(item.savedBy || []), currentUserId],
            }
          : item
      )
    );

    try {
      await api.put(`/reels/${reelId}/save`);
    } catch (err) {
      await fetchReels();
      setError(err.response?.data?.message || "Failed to save reel.");
    }
  };

  const toggleVideo = (reelId) => {
    const video = videoRefs.current[reelId];
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setPausedReels((previous) => ({ ...previous, [reelId]: false }));
    } else {
      video.pause();
      setPausedReels((previous) => ({ ...previous, [reelId]: true }));
    }
  };

  const handleCommentChange = (reelId, value) => {
    setCommentDrafts((previous) => ({ ...previous, [reelId]: value }));
    setCommentErrors((previous) => ({ ...previous, [reelId]: "" }));
  };

  const addComment = async (event, reelId) => {
    event.preventDefault();
    const text = (commentDrafts[reelId] || "").trim();

    if (!text) {
      setCommentErrors((previous) => ({
        ...previous,
        [reelId]: "Please enter a comment.",
      }));
      return;
    }

    setCommentLoading((previous) => ({ ...previous, [reelId]: true }));
    setCommentErrors((previous) => ({ ...previous, [reelId]: "" }));

    try {
      const response = await api.post(`/reels/${reelId}/comments`, { text });

      setReels((previous) =>
        previous.map((reel) =>
          getId(reel._id) === reelId
            ? { ...reel, comments: response.data.comments }
            : reel
        )
      );

      setCommentDrafts((previous) => ({ ...previous, [reelId]: "" }));
    } catch (err) {
      setCommentErrors((previous) => ({
        ...previous,
        [reelId]: err.response?.data?.message || "Failed to add comment.",
      }));
    } finally {
      setCommentLoading((previous) => ({ ...previous, [reelId]: false }));
    }
  };

  const deleteComment = async (reelId, commentId) => {
    if (!window.confirm("Delete this comment?")) return;

    try {
      const response = await api.delete(
        `/reels/${reelId}/comments/${commentId}`
      );

      setReels((previous) =>
        previous.map((reel) =>
          getId(reel._id) === reelId
            ? { ...reel, comments: response.data.comments }
            : reel
        )
      );
    } catch (err) {
      setCommentErrors((previous) => ({
        ...previous,
        [reelId]: err.response?.data?.message || "Failed to delete comment.",
      }));
    }
  };

  const openShareModal = (reel) => {
    setShareReelData(reel);
    setShareSearch("");
    setShareUsers([]);
    setShareError("");
    setShareSuccess("");
    setSharingUserId("");
  };

  const closeShareModal = () => {
    if (sharingUserId) return;

    setShareReelData(null);
    setShareSearch("");
    setShareUsers([]);
    setShareError("");
    setShareSuccess("");
  };

  useEffect(() => {
    if (!shareReelData) return;

    const query = shareSearch.trim();

    if (!query) {
      setShareUsers([]);
      setShareLoading(false);
      setShareError("");
      return;
    }

    let cancelled = false;

    const searchUsers = async () => {
      try {
        setShareLoading(true);
        setShareError("");

        const response = await api.get("/users/search", {
          params: { username: query },
        });

        if (!cancelled) {
          const users = response.data.users || [];
          setShareUsers(
            users.filter((user) => getId(user._id) !== currentUserId)
          );
        }
      } catch (err) {
        if (!cancelled) {
          setShareUsers([]);
          setShareError(
            err.response?.data?.message || "Failed to search users."
          );
        }
      } finally {
        if (!cancelled) setShareLoading(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shareSearch, shareReelData, currentUserId]);

  const shareReel = async (receiverId) => {
    if (!shareReelData || !receiverId || sharingUserId) return;

    setSharingUserId(receiverId);
    setShareError("");
    setShareSuccess("");

    try {
      await api.post(`/messages/reel/${getId(shareReelData._id)}`, {
        receiverId,
      });

      setShareSuccess("Reel shared successfully!");

      setTimeout(() => {
        setShareReelData(null);
        setShareSearch("");
        setShareUsers([]);
        setShareSuccess("");
        setSharingUserId("");
      }, 900);
    } catch (err) {
      setShareError(
        err.response?.data?.message ||
          "Failed to share reel. Please try again."
      );
      setSharingUserId("");
    }
  };

  if (loading) {
    return <div className="reels-loading">Loading reels...</div>;
  }

  if (error && reels.length === 0) {
    return (
      <div className="reels-loading">
        <p>{error}</p>
        <button className="reels-retry" onClick={fetchReels}>
          <FiRefreshCw /> Try again
        </button>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="reels-empty">
        <FiPlay size={42} />
        <h3>No reels yet</h3>
        <p>Share your first short video!</p>
        <button onClick={() => navigate("/create-reel")}>
          <FiPlus /> Create Reel
        </button>
      </div>
    );
  }

  return (
    <div className="reels-experience">
      <header className="reels-topbar">
        <button onClick={() => navigate(-1)} aria-label="Go back">
          <FiArrowLeft />
        </button>
        <h2>Reels</h2>
        <button
          onClick={() => navigate("/create-reel")}
          aria-label="Create reel"
        >
          <FiPlus />
        </button>
      </header>

      <main className="reels-snap-feed">
        {reels.map((reel) => {
          const reelId = getId(reel._id);
          const liked = (reel.likes || []).some(
            (user) => getId(user) === currentUserId
          );
          const saved = (reel.savedBy || []).some(
            (user) => getId(user) === currentUserId
          );

          return (
            <section className="reel-screen" key={reelId}>
              <video
                ref={(element) => {
                  videoRefs.current[reelId] = element;
                  if (element && observerRef.current) {
                    observerRef.current.observe(element);
                  }
                }}
                data-reel-id={reelId}
                className="reel-screen-video"
                src={reel.video}
                loop
                playsInline
                muted={muted}
                preload="metadata"
                onClick={() => toggleVideo(reelId)}
              />

              <button
                className="reel-center-play"
                onClick={() => toggleVideo(reelId)}
                aria-label="Play or pause reel"
              >
                <FiPlay />
              </button>

              <div className="reel-screen-top">
                <span>Reels</span>
                <button
                  onClick={() => setMuted((previous) => !previous)}
                  aria-label={muted ? "Unmute videos" : "Mute videos"}
                >
                  {muted ? <FiVolumeX /> : <FiVolume2 />}
                </button>
              </div>

              <div className="reel-screen-actions">
                <button
                  className={
                    liked ? "reel-screen-action liked" : "reel-screen-action"
                  }
                  onClick={() => toggleLike(reelId)}
                  aria-label={liked ? "Unlike reel" : "Like reel"}
                >
                  <FiHeart />
                  <span>{reel.likes?.length || 0}</span>
                </button>

                <button
                  className="reel-screen-action"
                  onClick={() => setActiveComments(reelId)}
                  aria-label="View comments"
                >
                  <FiMessageCircle />
                  <span>{reel.comments?.length || 0}</span>
                </button>

                <button
                  className="reel-screen-action"
                  onClick={() => openShareModal(reel)}
                  aria-label="Share reel"
                >
                  <FiShare2 />
                  <span>Share</span>
                </button>

                <button
                  className={
                    saved ? "reel-screen-action saved" : "reel-screen-action"
                  }
                  onClick={() => toggleSaveReel(reelId)}
                  aria-label={saved ? "Unsave reel" : "Save reel"}
                >
                  <FiBookmark />
                  <span>{saved ? "Saved" : "Save"}</span>
                </button>
              </div>

              <div className="reel-screen-info">
                <div className="reel-screen-author">
                  {reel.user?.profileImage ? (
                    <img src={reel.user.profileImage} alt="" />
                  ) : (
                    <div className="reel-screen-avatar">
                      {reel.user?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <strong>{reel.user?.username || "User"}</strong>
                </div>

                {reel.caption && <p>{reel.caption}</p>}

                <button
                  className="reel-comment-open"
                  onClick={() => setActiveComments(reelId)}
                >
                  <FiMessageCircle /> Add a comment...
                </button>
              </div>
            </section>
          );
        })}
      </main>

      {activeComments && (
        <div
          className="reel-comments-backdrop"
          onClick={() => setActiveComments(null)}
        >
          <section
            className="reel-comments-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const reel = reels.find(
                (item) => getId(item._id) === activeComments
              );

              if (!reel) return null;

              return (
                <>
                  <div className="reel-comments-sheet-header">
                    <h3>Comments ({reel.comments?.length || 0})</h3>
                    <button
                      onClick={() => setActiveComments(null)}
                      aria-label="Close comments"
                    >
                      <FiX />
                    </button>
                  </div>

                  <div className="reel-comments-sheet-list">
                    {reel.comments?.length ? (
                      reel.comments.map((comment) => {
                        const commentId = getId(comment._id);
                        const isOwnComment =
                          getId(comment.user) === currentUserId;

                        return (
                          <div className="reel-sheet-comment" key={commentId}>
                            <div>
                              <strong>{comment.user?.username || "User"}</strong>
                              <p>{comment.text}</p>
                              {comment.createdAt && (
                                <small>
                                  {new Date(comment.createdAt).toLocaleString()}
                                </small>
                              )}
                            </div>

                            {isOwnComment && (
                              <button
                                className="reel-sheet-delete"
                                onClick={() =>
                                  deleteComment(activeComments, commentId)
                                }
                                aria-label="Delete your comment"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="reel-comments-empty">
                        No comments yet. Be the first!
                      </p>
                    )}
                  </div>

                  {commentErrors[activeComments] && (
                    <p className="reel-sheet-error">
                      {commentErrors[activeComments]}
                    </p>
                  )}

                  <form
                    className="reel-sheet-form"
                    onSubmit={(event) => addComment(event, activeComments)}
                  >
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentDrafts[activeComments] || ""}
                      onChange={(event) =>
                        handleCommentChange(activeComments, event.target.value)
                      }
                      maxLength={1000}
                      disabled={!!commentLoading[activeComments]}
                    />
                    <button
                      type="submit"
                      disabled={
                        !!commentLoading[activeComments] ||
                        !(commentDrafts[activeComments] || "").trim()
                      }
                      aria-label="Post comment"
                    >
                      <FiSend />
                    </button>
                  </form>
                </>
              );
            })()}
          </section>
        </div>
      )}

      {shareReelData && (
        <div className="reel-share-backdrop" onClick={closeShareModal}>
          <section
            className="reel-share-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reel-share-header">
              <h3>Share Reel</h3>
              <button
                type="button"
                onClick={closeShareModal}
                aria-label="Close share window"
                disabled={!!sharingUserId}
              >
                <FiX />
              </button>
            </div>

            <div className="reel-share-search">
              <FiSearch />
              <input
                type="text"
                placeholder="Search people by username..."
                value={shareSearch}
                onChange={(event) => setShareSearch(event.target.value)}
                autoComplete="off"
              />
              {shareSearch && (
                <button
                  type="button"
                  onClick={() => setShareSearch("")}
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )}
            </div>

            {shareError && <p className="reel-share-error">{shareError}</p>}
            {shareSuccess && (
              <p className="reel-share-success">
                <FiCheck /> {shareSuccess}
              </p>
            )}

            <div className="reel-share-users">
              {!shareSearch.trim() ? (
                <p className="reel-share-hint">
                  Search for someone to send this reel to.
                </p>
              ) : shareLoading ? (
                <p className="reel-share-hint">Searching...</p>
              ) : shareUsers.length === 0 && !shareError ? (
                <p className="reel-share-hint">No users found.</p>
              ) : (
                shareUsers.map((user) => {
                  const userId = getId(user._id);
                  const isSending = sharingUserId === userId;

                  return (
                    <div className="reel-share-user" key={userId}>
                      {user.profileImage ? (
                        <img src={user.profileImage} alt="" />
                      ) : (
                        <div className="reel-share-avatar">
                          {user.username?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}

                      <div className="reel-share-user-info">
                        <strong>{user.username}</strong>
                        {user.bio && <small>{user.bio}</small>}
                      </div>

                      <button
                        type="button"
                        onClick={() => shareReel(userId)}
                        disabled={!!sharingUserId}
                      >
                        {isSending ? "Sending..." : "Send"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Reels;