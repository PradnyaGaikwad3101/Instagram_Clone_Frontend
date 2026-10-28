
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiBookmark,
  FiCamera,
  FiHeart,
  FiMessageCircle,
  FiSettings,
  FiX,
  FiSend,
  FiTrash2,
} from "react-icons/fi";
import api from "../services/api";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [savedReels, setSavedReels] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUserId = (currentUser?.id || currentUser?._id)?.toString();

  const fetchProfile = async () => {
    const response = await api.get("/users/profile");
    setUser(response.data.user);
  };

  const fetchPosts = async () => {
    const response = await api.get("/posts");
    const currentId = (currentUser?.id || currentUser?._id)?.toString();
    const userPosts = (response.data.posts || []).filter(
      (post) => post.user?._id?.toString() === currentId
    );
    setPosts(userPosts);
  };

  const fetchSavedReels = async () => {
    try {
      const response = await api.get("/reels/saved");
      setSavedReels(response.data.reels || []);
    } catch (error) {
      console.error(
        "Failed to load saved reels:",
        error.response?.data || error.message
      );
      setSavedReels([]);
    }
  };

  const fetchProfileData = async () => {
    try {
      setError("");
      await Promise.all([
        fetchProfile(),
        fetchPosts(),
        fetchSavedReels()
      ]);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (!selectedPost) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") setSelectedPost(null);
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [selectedPost]);

  const updatePostEverywhere = (updatedPost) => {
    setPosts((prev) =>
      prev.map((post) =>
        post._id === updatedPost._id ? updatedPost : post
      )
    );

    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        savedPosts: (prev.savedPosts || []).map((post) =>
          post?._id === updatedPost._id ? updatedPost : post
        ),
      };
    });

    setSelectedPost(updatedPost);
  };

  const handleLike = async () => {
    if (!selectedPost || actionLoading) return;

    try {
      setActionLoading(true);
      const response = await api.put(`/posts/${selectedPost._id}/like`);
      updatePostEverywhere({
        ...selectedPost,
        likes: response.data.likes || [],
      });
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to like post");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPost || actionLoading) return;

    try {
      setActionLoading(true);
      const response = await api.put(`/users/${selectedPost._id}/save`);

      setUser((prev) => {
        if (!prev) return prev;
        const currentSaved = prev.savedPosts || [];
        const postId = selectedPost._id.toString();
        const isSaved = response.data.saved;

        let updatedSaved;
        if (isSaved) {
          updatedSaved = currentSaved.some(
            (post) => (post?._id || post)?.toString() === postId
          )
            ? currentSaved
            : [...currentSaved, selectedPost];
        } else {
          updatedSaved = currentSaved.filter(
            (post) => (post?._id || post)?.toString() !== postId
          );
        }

        return { ...prev, savedPosts: updatedSaved };
      });
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to save post");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    const text = commentText.trim();

    if (!text || !selectedPost || commentLoading) return;

    try {
      setCommentLoading(true);
      const response = await api.post(
        `/posts/${selectedPost._id}/comments`,
        { text }
      );

      if (response.data.post) {
        updatePostEverywhere(response.data.post);
      }

      setCommentText("");
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!selectedPost || deletingCommentId) return;

    try {
      setDeletingCommentId(commentId);
      await api.delete(
        `/posts/${selectedPost._id}/comments/${commentId}`
      );

      const updatedPost = {
        ...selectedPost,
        comments: (selectedPost.comments || []).filter(
          (comment) => comment._id !== commentId
        ),
      };

      updatePostEverywhere(updatedPost);
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (error) return <div className="profile-error">{error}</div>;
  if (!user) return null;

  const savedPosts = user.savedPosts || [];

  const getPostId = (post) => (post?._id || post)?.toString();

  const isPostLiked = (post) =>
    (post.likes || []).some((like) => {
      const likeId = typeof like === "object" ? like._id : like;
      return likeId?.toString() === currentUserId;
    });

  const isPostSaved = (post) =>
    savedPosts.some((saved) => getPostId(saved) === post._id?.toString());

  const renderPosts = (items, saved = false) => {
    if (!items.length) {
      return (
        <div className="profile-empty">
          <div className="profile-empty-icon">
            {saved ? <FiBookmark /> : <FiCamera />}
          </div>
          <h3>{saved ? "Save your favorites" : "Share your first post"}</h3>
          <p>
            {saved
              ? "Posts you save will appear here, so you can find them again."
              : "When you share photos and videos, they'll appear on your profile."}
          </p>
          {!saved && (
            <button
              className="profile-share-button"
              onClick={() => navigate("/create")}
            >
              Share your first post
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="profile-posts">
        {items.map((post) => (
          <button
            type="button"
            className="profile-post"
            key={post._id}
            onClick={() => {
              setSelectedPost(post);
              setCommentText("");
            }}
            aria-label={`Open post${post.caption ? `: ${post.caption}` : ""}`}
          >
            <img
              src={post.image}
              alt={post.caption || (saved ? "Saved post" : "Post")}
              loading="lazy"
            />
            <div className="post-overlay">
              <span>
                <FiHeart fill="currentColor" /> {post.likes?.length || 0}
              </span>
              <span>
                <FiMessageCircle fill="currentColor" />{" "}
                {post.comments?.length || 0}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const postAuthor = selectedPost?.user || user;
  const postAuthorName = postAuthor?.username || user.username;

  return (
    <div className="profile-page">
      <section className="profile-header">
        <div className="profile-image-wrapper">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={`${user.username}'s profile`}
              className="profile-image"
            />
          ) : (
            <div className="profile-placeholder">
              {user.username?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </div>

        <div className="profile-info">
          <div className="profile-top">
            <h2>{user.username}</h2>
            <button
              className="edit-profile-button"
              onClick={() => navigate("/edit-profile")}
            >
              Edit profile
            </button>
            <button
              className="profile-settings-button"
              onClick={() => navigate("/edit-profile")}
              aria-label="Edit profile settings"
              title="Edit profile"
            >
              <FiSettings />
            </button>
          </div>

          <div className="profile-stats">
            <span><strong>{posts.length}</strong> posts</span>
            <span><strong>{user.followers?.length || 0}</strong> followers</span>
            <span><strong>{user.following?.length || 0}</strong> following</span>
          </div>

          <div className="profile-bio">
            <strong>{user.fullName || user.name || ""}</strong>
            {user.bio && <p>{user.bio}</p>}
          </div>
        </div>
      </section>

      <div className="profile-mobile-stats">
        <div><strong>{posts.length}</strong><span>posts</span></div>
        <div><strong>{user.followers?.length || 0}</strong><span>followers</span></div>
        <div><strong>{user.following?.length || 0}</strong><span>following</span></div>
      </div>

      <div className="profile-divider" />

      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === "posts" ? "active" : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          <FiGrid /><span>POSTS</span>
        </button>
        <button
          className={`profile-tab ${activeTab === "saved" ? "active" : ""}`}
          onClick={() => setActiveTab("saved")}
        >
          <FiBookmark /><span>SAVED</span>
        </button>
      </div>

      {activeTab === "posts" ? (
        renderPosts(posts)
      ) : (
        <div className="profile-saved-content">
          {savedPosts.length > 0 && renderPosts(savedPosts, true)}

          {savedReels.length > 0 && (
            <div className="profile-saved-reels">
              {savedReels.map((reel) => (
                <div className="profile-saved-reel" key={reel._id}>
                  {reel.video ? (
                    <video
                      src={reel.video}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <div className="profile-reel-unavailable">
                      Video unavailable
                    </div>
                  )}
                  <div className="profile-saved-reel-info">
                    <strong>{reel.user?.username || "User"}</strong>
                    {reel.caption && <p>{reel.caption}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {savedPosts.length === 0 && savedReels.length === 0 && (
            <div className="profile-empty">
              <div className="profile-empty-icon">
                <FiBookmark />
              </div>
              <h3>No Saved Items Yet</h3>
              <p>Your saved posts and reels will appear here.</p>
            </div>
          )}
        </div>
      )}

      {selectedPost && (
        <div
          className="profile-post-modal"
          onClick={() => setSelectedPost(null)}
          role="presentation"
        >
          <button
            type="button"
            className="profile-modal-close"
            onClick={() => setSelectedPost(null)}
            aria-label="Close post"
          >
            <FiX />
          </button>

          <div
            className="profile-modal-content"
            role="dialog"
            aria-modal="true"
            aria-label="Post details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-modal-image">
              <img
                src={selectedPost.image}
                alt={selectedPost.caption || "Post"}
              />
            </div>

            <div className="profile-modal-details">
              <div className="profile-modal-author">
                {postAuthor?.profileImage ? (
                  <img src={postAuthor.profileImage} alt="" />
                ) : (
                  <div className="profile-modal-avatar">
                    {postAuthorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <strong>{postAuthorName}</strong>
              </div>

              <div className="profile-modal-caption">
                <strong>{postAuthorName}</strong>
                <p>{selectedPost.caption || "No caption"}</p>
              </div>

              <div className="profile-modal-comments">
                {(selectedPost.comments || []).map((comment) => {
                  const commentUserId =
                    typeof comment.user === "object"
                      ? comment.user?._id
                      : comment.user;
                  const isOwnComment =
                    commentUserId?.toString() === currentUserId;

                  return (
                    <div className="profile-modal-comment" key={comment._id}>
                      <div>
                        <strong>
                          {comment.user?.username || "User"}
                        </strong>
                        <span>{comment.text}</span>
                      </div>
                      {isOwnComment && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment._id)}
                          disabled={deletingCommentId === comment._id}
                          aria-label="Delete comment"
                          title="Delete comment"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  );
                })}

                {(selectedPost.comments || []).length === 0 && (
                  <p className="profile-modal-no-comments">
                    No comments yet. Start the conversation.
                  </p>
                )}
              </div>

              <div className="profile-modal-actions">
                <div className="profile-modal-action-buttons">
                  <button
                    type="button"
                    className={isPostLiked(selectedPost) ? "liked" : ""}
                    onClick={handleLike}
                    disabled={actionLoading}
                    aria-label={isPostLiked(selectedPost) ? "Unlike post" : "Like post"}
                  >
                    <FiHeart fill={isPostLiked(selectedPost) ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById("profile-comment-input")?.focus()}
                    aria-label="Add comment"
                  >
                    <FiMessageCircle />
                  </button>
                  <button
                    type="button"
                    className={`profile-modal-save ${isPostSaved(selectedPost) ? "saved" : ""}`}
                    onClick={handleSave}
                    disabled={actionLoading}
                    aria-label={isPostSaved(selectedPost) ? "Unsave post" : "Save post"}
                  >
                    <FiBookmark fill={isPostSaved(selectedPost) ? "currentColor" : "none"} />
                  </button>
                </div>

                <strong>
                  {selectedPost.likes?.length || 0}{" "}
                  {(selectedPost.likes?.length || 0) === 1 ? "like" : "likes"}
                </strong>
                <span className="profile-modal-comment-count">
                  View all {selectedPost.comments?.length || 0} comments
                </span>
              </div>

              <form className="profile-modal-comment-form" onSubmit={handleAddComment}>
                <input
                  id="profile-comment-input"
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  maxLength={1000}
                  aria-label="Write a comment"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || commentLoading}
                  aria-label="Post comment"
                >
                  <FiSend />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;