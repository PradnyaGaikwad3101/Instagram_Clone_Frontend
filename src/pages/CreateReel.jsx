
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiVideo, FiUpload, FiX } from "react-icons/fi";
import api from "../services/api";
import "./CreateReel.css";

const CreateReel = () => {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    setError("");

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);

    setVideo(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    if (preview) URL.revokeObjectURL(preview);
    setVideo(null);
    setPreview("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!video) {
      setError("Please select a video to upload.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("video", video);
      formData.append("caption", caption.trim());

      await api.post("/reels", formData);

      if (preview) URL.revokeObjectURL(preview);
      navigate("/reels");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to upload reel. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-reel-page">
      <form className="create-reel-card" onSubmit={handleSubmit}>
        <h2>Create Reel</h2>
        <p className="create-reel-subtitle">
          Share a short video with your followers.
        </p>

        {preview ? (
          <div className="reel-preview">
            <video src={preview} controls playsInline />
            <button
              type="button"
              className="remove-reel-video"
              onClick={removeVideo}
              aria-label="Remove selected video"
            >
              <FiX />
            </button>
          </div>
        ) : (
          <label className="reel-upload-area">
            <FiVideo className="reel-upload-icon" />
            <span>Select a video</span>
            <small>Choose a video from your device</small>
            <span className="reel-upload-button">
              <FiUpload /> Choose Video
            </span>
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              hidden
            />
          </label>
        )}

        <label className="reel-caption-label" htmlFor="reel-caption">
          Caption
        </label>
        <textarea
          id="reel-caption"
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={2200}
          rows={3}
        />
        <div className="reel-caption-count">{caption.length}/2200</div>

        {error && <p className="create-reel-error">{error}</p>}

        <button
          type="submit"
          className="publish-reel-button"
          disabled={loading || !video}
        >
          {loading ? "Uploading Reel..." : "Share Reel"}
        </button>
      </form>
    </div>
  );
};

export default CreateReel;