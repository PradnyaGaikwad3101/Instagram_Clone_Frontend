import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Explore.css";

const Explore = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get("/posts");
        setPosts(response.data.posts || []);
      } catch (error) {
        console.log(error.response?.data?.message || "Failed to load posts");
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) {
    return <div className="explore-loading">Loading...</div>;
  }

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h2>Explore</h2>
        <p>Discover posts from the community</p>
      </div>
      {posts.length === 0 ? (
        <div className="explore-empty">
          <h3>No posts yet</h3>
          <p>Posts will appear here when users share them.</p>
        </div>
      ) : (
        <div className="explore-grid">
          {posts.map((post) => (
            <div
              className="explore-post"
              key={post._id}
              onClick={() => navigate(`/users/${post.user?._id}`)}
            >
              <img src={post.image} alt="Post" />
              <div className="explore-post-overlay">
                <span>♥ {post.likes?.length || 0}</span>
                <span>💬 {post.comments?.length || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Explore;