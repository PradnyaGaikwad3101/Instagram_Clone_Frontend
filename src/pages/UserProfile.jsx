import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
   FiArrowLeft,
   FiGrid,
   FiVideo,
   FiHeart,
   FiMessageCircle,
   FiBookmark,
   FiSend,
   FiTrash2,
   FiX,
  FiLock,
  FiCheck,
  FiXCircle,
} from "react-icons/fi";
import api from "../services/api";
import "./UserProfile.css";
import "./Profile.css";
const getId = (value) => {
   if (!value) return "";
   return typeof value === "object"
      ? (value._id || value.id || "").toString()
      : value.toString();
};
const getPostUser = (post) => post?.user || post?.author || {};
const getImage = (post) => post?.image || post?.imageUrl || "";
const getUserName = (user) => user?.username || user?.name || "User";
const UserProfile = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const currentUser = JSON.parse(localStorage.getItem("user") || "null");
   const currentUserId = getId(currentUser?._id || currentUser?.id);
   const [userData, setUserData] = useState(null);
   const [posts, setPosts] = useState([]);
   const [savedPosts, setSavedPosts] = useState([]);
   const [savedReels, setSavedReels] = useState([]);
   const [activeProfileTab, setActiveProfileTab] = useState("posts");
   const [selectedPost, setSelectedPost] = useState(null);
   const [commentText, setCommentText] = useState("");
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState("");
   const [actionLoading, setActionLoading] = useState(false);
   const [commentLoading, setCommentLoading] = useState(false);
   const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [profileStatus, setProfileStatus] = useState({ isFollowing: false, hasRequestedFollow: false, canViewPosts: true, isOwnProfile: false, pendingFollowRequests: [] });
  const [requestActionId, setRequestActionId] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
   const fetchUserProfile = useCallback(async () => {
      const response = await api.get(`/users/${id}`);
      setUserData(response.data.user);
    setProfileStatus({
      isFollowing: Boolean(response.data.isFollowing),
      hasRequestedFollow: Boolean(response.data.hasRequestedFollow),
      canViewPosts: response.data.canViewPosts !== false,
      isOwnProfile: Boolean(response.data.isOwnProfile),
      pendingFollowRequests: response.data.pendingFollowRequests || [],
    });
   }, [id]);
   const fetchPosts = useCallback(async () => {
      const response = await api.get("/posts");
      const userPosts = (response.data.posts || []).filter(
         (post) => getId(getPostUser(post)) === id.toString()
      );
      setPosts(userPosts);
   }, [id]);
   const fetchSavedPosts = useCallback(async () => {
      try {
         const response = await api.get("/users/profile");
         setSavedPosts(response.data.user?.savedPosts || []);
      } catch (err) {
         console.error(err.response?.data?.message || "Failed to load saved posts");
      }
   }, []);
   
const fetchSavedReels = useCallback(async () => {
  console.log("Current User ID:", currentUserId);
  console.log("Profile URL ID:", id);

  const isOwnProfile = Boolean(currentUserId && currentUserId === id?.toString());

  console.log("Checking saved reels:", {
    currentUserId,
    profileId: id,
    isOwnProfile
  });

  if (!isOwnProfile) {
    setSavedReels([]);
    return;
  }

  try {
    const response = await api.get("/reels/saved");
    console.log("Saved reels response:", response.data);
    setSavedReels(response.data.reels || []);
  } catch (err) {
    console.error(
      "Failed to load saved reels:",
      err.response?.data || err.message
    );
    setSavedReels([]);
  }
}, [currentUserId, id]);

   const refreshProfile = useCallback(async () => {
      setLoading(true);
      setError("");
      try {
         await Promise.all([fetchUserProfile(), fetchPosts(), fetchSavedPosts(), fetchSavedReels()]);
      } catch (err) {
         setError(err.response?.data?.message || "Failed to load user profile");
      } finally {
         setLoading(false);
      }
   }, [fetchUserProfile, fetchPosts, fetchSavedPosts, fetchSavedReels]);
   useEffect(() => {
      refreshProfile();
   }, [refreshProfile]);
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
      setPosts((previous) =>
         previous.map((post) =>
            getId(post) === getId(updatedPost) ? updatedPost : post
         )
      );
      setSavedPosts((previous) =>
         previous.map((post) =>
            getId(post) === getId(updatedPost) ? updatedPost : post
         )
      );
      setSelectedPost(updatedPost);
   };
   const handleFollow = async () => {
      if (followLoading) return;
      try {
         setFollowLoading(true);
         const response = await api.put(`/users/${id}/follow`);
         setProfileStatus((previous) => ({
            ...previous,
            isFollowing: Boolean(response.data.isFollowing),
            hasRequestedFollow: Boolean(response.data.hasRequestedFollow),
            canViewPosts: Boolean(response.data.isFollowing) || !userData?.isPrivate,
         }));
         await fetchUserProfile();
         if (response.data.isFollowing) await fetchPosts();
      } catch (err) {
         console.error(err.response?.data?.message || "Failed to update follow status");
      } finally {
         setFollowLoading(false);
      }
   };
   const handleFollowRequest = async (requesterId, action) => {
      if (requestActionId) return;
      try {
         setRequestActionId(requesterId);
         await api.put(`/users/follow-requests/${requesterId}`, { action });
         await refreshProfile();
      } catch (err) {
         console.error(err.response?.data?.message || "Failed to update follow request");
      } finally {
         setRequestActionId(null);
      }
   };
   const handleLike = async () => {
      if (!selectedPost || actionLoading) return;
      try {
         setActionLoading(true);
         const response = await api.put(`/posts/${getId(selectedPost)}/like`);
         updatePostEverywhere({
            ...selectedPost,
            likes: response.data.likes || [],
         });
      } catch (err) {
         console.error(err.response?.data?.message || "Failed to like post");
      } finally {
         setActionLoading(false);
      }
   };
   const handleSave = async () => {
      if (!selectedPost || actionLoading) return;
      try {
         setActionLoading(true);
         const response = await api.put(`/users/${getId(selectedPost)}/save`);
         const isSaved = response.data.saved;
         const postId = getId(selectedPost);
         setSavedPosts((previous) =>
            isSaved
               ? previous.some((post) => getId(post) === postId)
                  ? previous
                  : [...previous, selectedPost]
               : previous.filter((post) => getId(post) !== postId)
         );
      } catch (err) {
         console.error(err.response?.data?.message || "Failed to save post");
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
            `/posts/${getId(selectedPost)}/comments`,
            { text }
         );
         if (response.data.post) updatePostEverywhere(response.data.post);
         setCommentText("");
      } catch (err) {
         console.error(err.response?.data?.message || "Failed to add comment");
      } finally {
         setCommentLoading(false);
      }
   };
   const handleDeleteComment = async (commentId) => {
      if (!selectedPost || deletingCommentId) return;
      try {
         setDeletingCommentId(commentId);
         await api.delete(
            `/posts/${getId(selectedPost)}/comments/${commentId}`
         );
         updatePostEverywhere({
            ...selectedPost,
            comments: (selectedPost.comments || []).filter(
               (comment) => getId(comment) !== getId(commentId)
            ),
         });
      } catch (err) {
         console.error(err.response?.data?.message || "Failed to delete comment");
      } finally {
         setDeletingCommentId(null);
      }
   };
   const isOwnProfile = currentUserId === getId(userData);
   const isFollowing = (userData?.followers || []).some(
      (follower) => getId(follower) === currentUserId
   );
   const isPostLiked = (post) =>
      (post?.likes || []).some((like) => getId(like) === currentUserId);
   const isPostSaved = (post) =>
      savedPosts.some((saved) => getId(saved) === getId(post));
   const postAuthor = selectedPost ? getPostUser(selectedPost) : userData;
   const postAuthorName = getUserName(postAuthor);
   const handleMessage = () => {
      if (userData?._id) navigate(`/messages?user=${userData._id}`);
   };
   if (loading) {
      return <div className="user-profile-loading">Loading profile...</div>;
   }
   if (error || !userData) {
      return (
         <div className="user-profile-error">
            <p>{error || "User not found"}</p>
            <button onClick={() => navigate(-1)}>Go Back</button>
         </div>
      );
   }
   return (
      <div className="user-profile-page">
         <button
            type="button"
            className="user-profile-back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
         >
            <FiArrowLeft />
         </button>
         <header className="user-profile-header">
            <div className="user-profile-image-wrapper">
               {userData.profileImage ? (
                  <img
                     className="user-profile-image"
                     src={userData.profileImage}
                     alt={userData.username}
                  />
               ) : (
                  <div className="user-profile-placeholder">
                     {userData.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
               )}
            </div>
            <div className="user-profile-info">
               <div className="user-profile-top">
                  <h2>{userData.username}</h2>
                  {!isOwnProfile && (
                     <div className="user-profile-actions">
                        <button
                           type="button"
                           className={`follow-button ${profileStatus.isFollowing ? "following-button" : profileStatus.hasRequestedFollow ? "requested-button" : ""}`}
                           onClick={handleFollow}
                           disabled={followLoading}
                        >
                           {followLoading ? "Please wait..." : profileStatus.isFollowing ? "Following" : profileStatus.hasRequestedFollow ? "Requested" : "Follow"}
                        </button>
                        <button className="message-button" onClick={handleMessage}>
                           Message
                        </button>
                     </div>
                  )}
               </div>
               <div className="user-profile-stats">
                  <span><strong>{posts.length}</strong> posts</span>
                  <span><strong>{userData.followers?.length || 0}</strong> followers</span>
                  <span><strong>{userData.following?.length || 0}</strong> following</span>
               </div>
               <div className="user-profile-bio">
                  <strong>{userData.fullName || userData.name || userData.username}</strong>
                  {userData.bio && <p>{userData.bio}</p>}
               </div>
            </div>
         </header>
         {profileStatus.isOwnProfile && profileStatus.pendingFollowRequests.length > 0 && (
            <section className="follow-requests-section">
               <h3>Follow Requests</h3>
               {profileStatus.pendingFollowRequests.map((request) => (
                  <div className="follow-request-item" key={getId(request)}>
                     {request.profileImage ? (
                        <img src={request.profileImage} alt="" />
                     ) : (
                        <div className="follow-request-avatar">{getUserName(request).charAt(0).toUpperCase()}</div>
                     )}
                     <strong>{getUserName(request)}</strong>
                     <button type="button" onClick={() => handleFollowRequest(getId(request), "accept")} disabled={requestActionId === getId(request)}>
                        <FiCheck /> Accept
                     </button>
                     <button type="button" onClick={() => handleFollowRequest(getId(request), "reject")} disabled={requestActionId === getId(request)}>
                        <FiXCircle /> Reject
                     </button>
                  </div>
               ))}
            </section>
         )}
         <div className="user-profile-divider" />
         <div className="user-profile-tabs">
            <button
               type="button"
               className={activeProfileTab === "posts" ? "user-profile-tab active" : "user-profile-tab"}
               onClick={() => setActiveProfileTab("posts")}
            >
               <FiGrid />
               <span>POSTS</span>
            </button>
            {isOwnProfile && (
               <button
                  type="button"
                  className={activeProfileTab === "saved" ? "user-profile-tab active" : "user-profile-tab"}
                  onClick={() => setActiveProfileTab("saved")}
               >
                  <FiBookmark />
                  <span>SAVED REELS</span>
               </button>
            )}
         </div>
         {activeProfileTab === "posts" && (
         <>
         <div className="user-profile-posts-heading">
            <FiGrid />
            <span>POSTS</span>
         </div>
         {!profileStatus.canViewPosts ? (
            <div className="user-profile-empty">
               <FiLock className="user-profile-empty-icon" />
               <h3>This Account is Private</h3>
               <p>Follow this account to see their photos and videos.</p>
            </div>
         ) : posts.length ? (
            <div className="user-profile-posts">
               {posts.map((post) => (
                  <button
                     type="button"
                     className="user-profile-post"
                     key={getId(post)}
                     onClick={() => {
                        setSelectedPost(post);
                        setCommentText("");
                     }}
                     aria-label={`Open post${post.caption ? `: ${post.caption}` : ""}`}
                  >
                     <img
                        src={getImage(post)}
                        alt={post.caption || "Post"}
                        loading="lazy"
                     />
                     <div className="user-profile-post-overlay">
                        <span><FiHeart fill="currentColor" /> {post.likes?.length || 0}</span>
                        <span><FiMessageCircle fill="currentColor" /> {post.comments?.length || 0}</span>
                     </div>
                  </button>
               ))}
            </div>
         ) : (
            <div className="user-profile-empty">
               <FiGrid className="user-profile-empty-icon" />
               <h3>No Posts Yet</h3>
            </div>
         )}
         </>
         )}
         {isOwnProfile && activeProfileTab === "saved" && (
            <div className="user-profile-saved-reels">
               {savedReels.length ? (
                  savedReels.map((reel) => (
                     <div className="user-profile-saved-reel" key={getId(reel)}>
                        {reel.video ? (
                           <video
                              src={reel.video}
                              controls
                              preload="metadata"
                              aria-label={`Saved reel by ${getUserName(reel.user)}`}
                           />
                        ) : (
                           <div className="user-profile-reel-unavailable">Video unavailable</div>
                        )}
                        <div className="user-profile-reel-info">
                           <strong>{getUserName(reel.user)}</strong>
                           {reel.caption && <p>{reel.caption}</p>}
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="user-profile-empty">
                     <FiVideo className="user-profile-empty-icon" />
                     <h3>No Saved Reels Yet</h3>
                     <p>Reels you save will appear here.</p>
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
                        src={getImage(selectedPost)}
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
                        {(selectedPost.comments || []).map((comment, index) => {
                           const commentUser = comment.user || comment.author || {};
                           const commentId = getId(comment) || `${index}`;
                           const commentUserId = getId(commentUser);
                           const canDelete = commentUserId === currentUserId;
                           return (
                              <div className="profile-modal-comment" key={commentId}>
                                 <div>
                                    <strong>{getUserName(commentUser)}</strong>
                                    <span>{comment.text || comment.comment}</span>
                                 </div>
                                 {canDelete && (
                                    <button
                                       type="button"
                                       onClick={() => handleDeleteComment(commentId)}
                                       disabled={deletingCommentId === commentId}
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
                              onClick={() => document.getElementById("user-profile-comment-input")?.focus()}
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
                           id="user-profile-comment-input"
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
export default UserProfile;