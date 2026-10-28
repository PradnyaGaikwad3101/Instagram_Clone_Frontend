import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiHeart, FiMessageCircle, FiSend, FiMoreHorizontal, FiBookmark, FiEye, FiTrash2 } from "react-icons/fi";
import api from "../services/api";
import "./Home.css";

const STORY_DURATION = 5000;

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [selectedUserIndex, setSelectedUserIndex] = useState(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState({});
  const [savedPosts, setSavedPosts] = useState([]);
  const [showStoryMenu, setShowStoryMenu] = useState(false);
  const [storyReplyText, setStoryReplyText] = useState("");
  const [storyReplyLoading, setStoryReplyLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePostData, setSharePostData] = useState(null);
  const [shareSearch, setShareSearch] = useState("");
  const [shareUsers, setShareUsers] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [sharingUserId, setSharingUserId] = useState(null);
  const [shareMessage, setShareMessage] = useState("");
  const [selectedShareUsers, setSelectedShareUsers] = useState([]);
  const [followingUserId, setFollowingUserId] = useState(null);

  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const selectedStoryGroup = selectedUserIndex !== null ? stories[selectedUserIndex] : null;
  const selectedStory = selectedStoryGroup?.stories?.[selectedStoryIndex] || null;
  const isOwnStory = selectedStoryGroup?.user?._id?.toString() === currentUser?.id?.toString();

  const fetchPosts = async () => {
    try {
      const response = await api.get("/posts");
      setPosts(response.data.posts || []);
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to load posts");
    }
  };

  const fetchStories = async () => {
    try {
      const response = await api.get("/stories");
      setStories(response.data.stories || []);
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to load stories");
    }
  };

  const fetchSavedPosts = async () => {
    try {
      const response = await api.get("/users/profile");
      const savedPostIds = response.data.user.savedPosts?.map((post) =>
        typeof post === "object" ? post._id : post
      ) || [];
      setSavedPosts(savedPostIds);
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to load saved posts");
    }
  };

  const fetchSuggestions = async () => {
    try {
      const [postsResponse, profileResponse] = await Promise.all([
        api.get("/posts"),
        api.get("/users/profile")
      ]);
      const allPosts = postsResponse.data.posts || [];
      const following = profileResponse.data.user.following || [];
      const followingIds = following.map((user) =>
        typeof user === "object" ? user._id?.toString() : user?.toString()
      );
      const usersMap = new Map();

      allPosts.forEach((post) => {
        const user = post.user;
        if (!user?._id) return;
        const userId = user._id.toString();
        if (userId === currentUser?.id?.toString() || followingIds.includes(userId)) return;
        if (!usersMap.has(userId)) usersMap.set(userId, user);
      });

      setSuggestedUsers(Array.from(usersMap.values()).slice(0, 5));
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to load suggestions");
    }
  };

  const fetchHomeData = async () => {
    setLoading(true);
    await Promise.all([fetchPosts(), fetchStories(), fetchSavedPosts(), fetchSuggestions()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const handleFollowSuggestion = async (userId) => {
    if (!userId || followingUserId) return;
    try {
      setFollowingUserId(userId);
      await api.put(`/users/${userId}/follow`);
      setSuggestedUsers((prev) => prev.filter((user) => user._id !== userId));
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to follow user");
    } finally {
      setFollowingUserId(null);
    }
  };

  const markStoryAsViewed = async (story) => {
    try {
      await api.put(`/stories/${story._id}/view`);
      setStories((prevStories) =>
        prevStories.map((group) => {
          if (group.user?._id !== story.user?._id) return group;
          return {
            ...group,
            stories: group.stories.map((item) => {
              if (item._id !== story._id) return item;
              const viewers = item.viewers || [];
              const alreadyViewed = viewers.some(
                (userId) => userId?.toString() === currentUser?.id?.toString()
              );
              if (alreadyViewed) return item;
              return { ...item, viewers: [...viewers, currentUser?.id] };
            })
          };
        })
      );
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to mark story as viewed");
    }
  };

  const openStory = async (userIndex, storyIndex = 0) => {
    const group = stories[userIndex];
    if (!group || !group.stories?.length) return;
    setSelectedUserIndex(userIndex);
    setSelectedStoryIndex(storyIndex);
    setStoryProgress(0);
    setShowStoryMenu(false);
    setStoryReplyText("");
    await markStoryAsViewed(group.stories[storyIndex]);
  };

  const closeStory = () => {
    setSelectedUserIndex(null);
    setSelectedStoryIndex(0);
    setStoryProgress(0);
    setShowStoryMenu(false);
    setStoryReplyText("");
  };

  const showNextStory = async () => {
    if (selectedUserIndex === null || !selectedStoryGroup) return;
    const userStories = selectedStoryGroup.stories || [];

    if (selectedStoryIndex < userStories.length - 1) {
      const nextStoryIndex = selectedStoryIndex + 1;
      setSelectedStoryIndex(nextStoryIndex);
      setStoryProgress(0);
      setShowStoryMenu(false);
      setStoryReplyText("");
      await markStoryAsViewed(userStories[nextStoryIndex]);
      return;
    }

    if (selectedUserIndex < stories.length - 1) {
      const nextUserIndex = selectedUserIndex + 1;
      const nextUserStories = stories[nextUserIndex]?.stories || [];
      setSelectedUserIndex(nextUserIndex);
      setSelectedStoryIndex(0);
      setStoryProgress(0);
      setShowStoryMenu(false);
      setStoryReplyText("");
      if (nextUserStories.length > 0) await markStoryAsViewed(nextUserStories[0]);
      return;
    }

    closeStory();
  };

  const showPreviousStory = async () => {
    if (selectedUserIndex === null || !selectedStoryGroup) return;

    if (selectedStoryIndex > 0) {
      const previousStoryIndex = selectedStoryIndex - 1;
      setSelectedStoryIndex(previousStoryIndex);
      setStoryProgress(0);
      setShowStoryMenu(false);
      setStoryReplyText("");
      await markStoryAsViewed(selectedStoryGroup.stories[previousStoryIndex]);
      return;
    }

    if (selectedUserIndex > 0) {
      const previousUserIndex = selectedUserIndex - 1;
      const previousUserStories = stories[previousUserIndex]?.stories || [];
      const previousStoryIndex = previousUserStories.length - 1;
      setSelectedUserIndex(previousUserIndex);
      setSelectedStoryIndex(previousStoryIndex);
      setStoryProgress(0);
      setShowStoryMenu(false);
      setStoryReplyText("");
      if (previousStoryIndex >= 0) await markStoryAsViewed(previousUserStories[previousStoryIndex]);
      return;
    }

    setStoryProgress(0);
  };

  const handleDeleteStory = async () => {
    if (!selectedStory) return;
    const confirmed = window.confirm("Are you sure you want to delete this story?");
    if (!confirmed) return;

    try {
      await api.delete(`/stories/${selectedStory._id}`);
      const currentUserIndex = selectedUserIndex;
      const currentStoryIndex = selectedStoryIndex;
      const updatedStories = stories
        .map((group, groupIndex) => {
          if (groupIndex !== currentUserIndex) return group;
          return {
            ...group,
            stories: group.stories.filter((story) => story._id !== selectedStory._id)
          };
        })
        .filter((group) => group.stories.length > 0);

      setStories(updatedStories);
      setShowStoryMenu(false);
      setStoryProgress(0);

      if (updatedStories.length === 0) {
        closeStory();
        return;
      }

      const deletedUserStillExists = updatedStories.some(
        (group) => group.user?._id?.toString() === selectedStoryGroup?.user?._id?.toString()
      );

      if (!deletedUserStillExists) {
        if (currentUserIndex < updatedStories.length) {
          setSelectedUserIndex(currentUserIndex);
          setSelectedStoryIndex(0);
        } else {
          setSelectedUserIndex(updatedStories.length - 1);
          setSelectedStoryIndex(Math.max(updatedStories[updatedStories.length - 1].stories.length - 1, 0));
        }
        return;
      }

      const newUserIndex = updatedStories.findIndex(
        (group) => group.user?._id?.toString() === selectedStoryGroup?.user?._id?.toString()
      );
      const remainingStories = updatedStories[newUserIndex]?.stories || [];

      if (currentStoryIndex < remainingStories.length) {
        setSelectedUserIndex(newUserIndex);
        setSelectedStoryIndex(currentStoryIndex);
      } else {
        setSelectedUserIndex(newUserIndex);
        setSelectedStoryIndex(Math.max(remainingStories.length - 1, 0));
      }
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to delete story");
    }
  };

  const handleStoryReply = async (e) => {
    e.preventDefault();
    const text = storyReplyText.trim();
    if (!text || !selectedStory || isOwnStory) return;

    try {
      setStoryReplyLoading(true);
      await api.post(`/messages/story/${selectedStory._id}`, { text });
      setStoryReplyText("");
      closeStory();
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to send story reply");
    } finally {
      setStoryReplyLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUserIndex === null || !selectedStory) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setStoryProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        showNextStory();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [selectedUserIndex, selectedStoryIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (selectedUserIndex === null) return;
      if (event.key === "ArrowRight") showNextStory();
      if (event.key === "ArrowLeft") showPreviousStory();
      if (event.key === "Escape") closeStory();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedUserIndex, selectedStoryIndex, stories]);

  const handleLike = async (postId) => {
    try {
      const response = await api.put(`/posts/${postId}/like`);
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId ? { ...post, likes: response.data.likes } : post
        )
      );
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to like post");
    }
  };

  const handleSave = async (postId) => {
    try {
      const response = await api.put(`/users/${postId}/save`);
      setSavedPosts((prev) => {
        if (response.data.saved) return [...prev, postId];
        return prev.filter((id) => id !== postId);
      });
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to save post");
    }
  };

  const handleCommentChange = (postId, value) => {
    setCommentText((prev) => ({ ...prev, [postId]: value }));
  };

  const handleComment = async (postId) => {
    const text = commentText[postId]?.trim();
    if (!text) return;

    try {
      const response = await api.post(`/posts/${postId}/comments`, { text });
      setPosts((prevPosts) =>
        prevPosts.map((post) => post._id === postId ? response.data.post : post)
      );
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to add comment");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await api.delete(`/posts/${postId}/comments/${commentId}`);
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id !== postId) return post;
          return {
            ...post,
            comments: post.comments.filter((comment) => comment._id !== commentId)
          };
        })
      );
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to delete comment");
    }
  };

  const openShareModal = (post) => {
    setSharePostData(post);
    setShowShareModal(true);
    setShareSearch("");
    setShareUsers([]);
    setShareMessage("");
    setSelectedShareUsers([]);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setSharePostData(null);
    setShareSearch("");
    setShareUsers([]);
    setShareMessage("");
    setSelectedShareUsers([]);
    setSharingUserId(null);
  };

  useEffect(() => {
    if (!showShareModal || !shareSearch.trim()) {
      setShareUsers([]);
      return;
    }

    const searchUsers = async () => {
      try {
        setShareLoading(true);
        const response = await api.get(`/users/search?username=${encodeURIComponent(shareSearch.trim())}`);
        const users = (response.data.users || []).filter(
          (user) => user._id?.toString() !== currentUser?.id?.toString()
        );
        setShareUsers(users);
      } catch (error) {
        setShareUsers([]);
        console.log(error.response?.data?.message || "Failed to search users");
      } finally {
        setShareLoading(false);
      }
    };

    const timeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeout);
  }, [showShareModal, shareSearch]);

  const handleSharePost = (user) => {
    if (!user || sharingUserId) return;
    setShareMessage("");
    setSelectedShareUsers((prev) => {
      const alreadySelected = prev.some((item) => item._id === user._id);
      return alreadySelected
        ? prev.filter((item) => item._id !== user._id)
        : [...prev, user];
    });
  };

  const sendSelectedShares = async () => {
    if (!sharePostData || selectedShareUsers.length === 0 || sharingUserId) return;
    setSharingUserId("sending");
    setShareMessage("");
    const failedUsers = [];
    let sentCount = 0;

    for (const user of selectedShareUsers) {
      try {
        await api.post(`/messages/post/${sharePostData._id}`, { receiverId: user._id });
        sentCount += 1;
      } catch (error) {
        failedUsers.push(user.username || "user");
      }
    }

    setSharingUserId(null);

    if (sentCount === selectedShareUsers.length) {
      setShareMessage(`Post sent to ${sentCount} ${sentCount === 1 ? "person" : "people"}.`);
      setTimeout(closeShareModal, 900);
    } else if (sentCount > 0) {
      setShareMessage(`Sent to ${sentCount}. Could not send to: ${failedUsers.map((name) => `@${name}`).join(", ")}.`);
    } else {
      setShareMessage("Couldn't share the post. Please try again.");
    }
  };

  if (loading) return <div className="home-loading">Loading...</div>;

  return (
    <>
      <div className="home-page">
        <div className="home-main">
          {stories.length > 0 && (
            <div className="stories-section">
              <div className="stories-list">
                {stories.map((storyGroup, index) => {
                  const user = storyGroup.user;
                  return (
                    <div className="story-item" key={user?._id} onClick={() => openStory(index)}>
                      <div className="story-avatar-wrapper">
                        {user?.profileImage ? (
                          <img src={user.profileImage} alt={user.username} className="story-avatar" />
                        ) : (
                          <div className="story-avatar story-placeholder">
                            {user?.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="story-username">{user?.username}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="feed">
            {posts.length === 0 ? (
              <div className="empty-feed">
                <h2>No posts yet</h2>
                <p>Create your first post to get started.</p>
              </div>
            ) : (
              posts.map((post) => {
                const isLiked = post.likes.some((userId) => userId.toString() === currentUser?.id);
                const isSaved = savedPosts.includes(post._id);

                return (
                  <article className="post-card" key={post._id}>
                    <div className="post-header">
                      <div className="post-user" onClick={() => navigate(`/users/${post.user?._id}`)}>
                        {post.user?.profileImage ? (
                          <img src={post.user.profileImage} alt={post.user.username} className="post-avatar" />
                        ) : (
                          <div className="post-avatar placeholder-avatar">
                            {post.user?.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <strong>{post.user?.username}</strong>
                      </div>
                      <FiMoreHorizontal className="more-icon" />
                    </div>

                    <img src={post.image} alt={post.caption || "Instagram post"} className="post-image" />

                    <div className="post-actions">
                      <button onClick={() => handleLike(post._id)} className={`action-button ${isLiked ? "liked" : ""}`}>
                        <FiHeart fill={isLiked ? "currentColor" : "none"} />
                      </button>
                      <button
                        className="action-button"
                        onClick={() => {
                          const commentInput = document.getElementById(`comment-input-${post._id}`);
                          commentInput?.focus();
                          commentInput?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        aria-label="Comment on post"
                      >
                        <FiMessageCircle />
                      </button>
                      <button className="action-button" onClick={() => openShareModal(post)} aria-label="Share post">
                        <FiSend />
                      </button>
                      <button onClick={() => handleSave(post._id)} className={`action-button save-button ${isSaved ? "saved" : ""}`}>
                        <FiBookmark fill={isSaved ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <div className="post-content">
                      <strong>{post.likes.length} {post.likes.length === 1 ? "like" : "likes"}</strong>
                      {post.caption && (
                        <p className="post-caption">
                          <strong>{post.user?.username}</strong> {post.caption}
                        </p>
                      )}

                      {post.comments.length > 0 && (
                        <div className="comments">
                          {post.comments.map((comment) => (
                            <div className="comment" key={comment._id}>
                              <span><strong>{comment.user?.username}</strong> {comment.text}</span>
                              {comment.user?._id === currentUser?.id && (
                                <button onClick={() => handleDeleteComment(post._id, comment._id)}>Delete</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="comment-box">
                        <input
                          id={`comment-input-${post._id}`}
                          type="text"
                          placeholder="Add a comment..."
                          value={commentText[post._id] || ""}
                          onChange={(e) => handleCommentChange(post._id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleComment(post._id);
                          }}
                        />
                        <button onClick={() => handleComment(post._id)}>Post</button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <aside className="suggestions-panel">
          <div className="suggestions-profile">
            {currentUser?.profileImage ? (
              <img src={currentUser.profileImage} alt={currentUser.username} />
            ) : (
              <div className="suggestions-avatar">{currentUser?.username?.charAt(0).toUpperCase()}</div>
            )}
            <div>
              <strong>@{currentUser?.username}</strong>
              <span>Your profile</span>
            </div>
            <button onClick={() => navigate("/profile")}>View</button>
          </div>

          <div className="suggestions-heading">
            <strong>Suggested for you</strong>
            <span
              onClick={() => navigate("/search")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/search");
                }
              }}
            >
              See All
            </span>
          </div>

          <div className="suggestions-list">
            {suggestedUsers.length === 0 ? (
              <p className="no-suggestions">No suggestions right now.</p>
            ) : (
              suggestedUsers.map((user) => (
                <div className="suggestion-user" key={user._id}>
                  <div className="suggestion-user-info" onClick={() => navigate(`/users/${user._id}`)}>
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={user.username} />
                    ) : (
                      <div className="suggestion-avatar">{user.username?.charAt(0).toUpperCase()}</div>
                    )}
                    <div>
                      <strong>@{user.username}</strong>
                      <span>{user.bio || "Suggested for you"}</span>
                    </div>
                  </div>
                  <button onClick={() => handleFollowSuggestion(user._id)} disabled={followingUserId === user._id}>
                    {followingUserId === user._id ? "Following..." : "Follow"}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="suggestions-footer">
            <span>Instagram Clone</span>
            <span>© 2026</span>
          </div>
        </aside>
      </div>

      {showShareModal && sharePostData && (
        <div className="share-modal-overlay" onClick={closeShareModal}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>Share Post</h3>
              <button className="share-modal-close" onClick={closeShareModal} aria-label="Close share modal">×</button>
            </div>

            <div className="share-post-preview">
              <img src={sharePostData.image} alt="Post" />
              <div>
                <strong>{sharePostData.user?.username}</strong>
                {sharePostData.caption && <p>{sharePostData.caption}</p>}
              </div>
            </div>

            <input
              type="text"
              className="share-search-input"
              placeholder="Search username..."
              value={shareSearch}
              onChange={(e) => setShareSearch(e.target.value)}
              autoFocus
            />

            {shareMessage && <p className="share-message">{shareMessage}</p>}

            <div className="share-selection-summary">
              {selectedShareUsers.length > 0 ? `${selectedShareUsers.length} selected` : "Select one or more people"}
            </div>

            <div className="share-users-list">
              {shareLoading ? (
                <p className="share-status">Searching...</p>
              ) : !shareSearch.trim() ? (
                <p className="share-status">Search by username to find people.</p>
              ) : shareUsers.length === 0 ? (
                <p className="share-status">No users found. Try another username.</p>
              ) : (
                shareUsers.map((user) => {
                  const isSelected = selectedShareUsers.some((item) => item._id === user._id);
                  return (
                    <button
                      type="button"
                      key={user._id}
                      className={`share-user-item ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSharePost(user)}
                      disabled={sharingUserId !== null}
                      aria-pressed={isSelected}
                    >
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={user.username} />
                      ) : (
                        <div className="share-user-placeholder">{user.username?.charAt(0).toUpperCase()}</div>
                      )}
                      <div className="share-user-info">
                        <strong>@{user.username}</strong>
                        {user.bio && <span>{user.bio}</span>}
                      </div>
                      <span className={`share-select-indicator ${isSelected ? "checked" : ""}`}>
                        {isSelected ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              className="share-send-selected"
              onClick={sendSelectedShares}
              disabled={selectedShareUsers.length === 0 || sharingUserId !== null}
            >
              {sharingUserId === "sending" ? "Sending..." : `Send${selectedShareUsers.length ? ` (${selectedShareUsers.length})` : ""}`}
            </button>
          </div>
        </div>
      )}

      {selectedStory && (
        <div className="story-viewer" onClick={closeStory}>
          <div className="story-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="story-progress-container">
              {selectedStoryGroup.stories.map((story, index) => (
                <div className="story-progress-track" key={story._id}>
                  <div
                    className="story-progress-bar"
                    style={{
                      width: index < selectedStoryIndex ? "100%" : index === selectedStoryIndex ? `${storyProgress}%` : "0%"
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="story-viewer-header">
              <div className="story-viewer-user">
                {selectedStoryGroup.user?.profileImage ? (
                  <img src={selectedStoryGroup.user.profileImage} alt={selectedStoryGroup.user.username} />
                ) : (
                  <div className="story-viewer-placeholder">{selectedStoryGroup.user?.username?.charAt(0).toUpperCase()}</div>
                )}
                <strong>{selectedStoryGroup.user.username}</strong>
              </div>

              <div className="story-header-actions">
                {isOwnStory && (
                  <div className="story-menu-wrapper">
                    <button className="story-menu-button" onClick={() => setShowStoryMenu((prev) => !prev)} aria-label="Story options">
                      <FiMoreHorizontal />
                    </button>
                    {showStoryMenu && (
                      <div className="story-menu">
                        <button onClick={handleDeleteStory}><FiTrash2 /> Delete Story</button>
                      </div>
                    )}
                  </div>
                )}
                <button className="story-close-button" onClick={closeStory}>×</button>
              </div>
            </div>

            <button className="story-navigation story-navigation-left" onClick={showPreviousStory} aria-label="Previous story">‹</button>
            <img src={selectedStory.image} alt="Story" className="story-viewer-image" />
            <button className="story-navigation story-navigation-right" onClick={showNextStory} aria-label="Next story">›</button>

            {!isOwnStory && (
              <form className="story-reply-form" onSubmit={handleStoryReply} onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder={`Reply to ${selectedStoryGroup.user?.username || "story"}...`}
                  value={storyReplyText}
                  onChange={(e) => setStoryReplyText(e.target.value)}
                  maxLength={500}
                  disabled={storyReplyLoading}
                />
                <button type="submit" disabled={storyReplyLoading || !storyReplyText.trim()} aria-label="Send story reply">
                  <FiSend />
                </button>
              </form>
            )}

            {isOwnStory && (
              <div className="story-viewers-panel">
                <div className="story-viewers-count">
                  <FiEye />
                  <span>{selectedStory.viewers?.length || 0} {selectedStory.viewers?.length === 1 ? "view" : "views"}</span>
                </div>
                {selectedStory.viewers?.length > 0 && (
                  <div className="story-viewers-list">
                    {selectedStory.viewers.map((viewer) => (
                      <div className="story-viewer-item" key={viewer._id}>
                        {viewer.profileImage ? (
                          <img src={viewer.profileImage} alt={viewer.username} />
                        ) : (
                          <div className="story-viewer-avatar-placeholder">{viewer.username?.charAt(0).toUpperCase()}</div>
                        )}
                        <span>{viewer.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Home;