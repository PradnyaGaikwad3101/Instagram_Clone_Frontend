import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiImage, FiX } from "react-icons/fi";

import api from "../services/api";
import "./CreatePost.css";

const CreatePost = () => {
  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }

    setError("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImage(null);
    setPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!image) {
      setError("Please select an image.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();

      formData.append("image", image);
      formData.append("caption", caption);

      await api.post("/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      navigate("/home");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to create post"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-page">
      <div className="create-card">
        <div className="create-header">
          <h2>Create new post</h2>
        </div>

        {!preview ? (
          <div className="image-selector">
            <FiImage className="image-icon" />

            <h3>Upload a photo</h3>

            <p>Choose a photo from your computer</p>

            <label className="select-image-button">
              Select from computer
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />
            </label>
          </div>
        ) : (
          <div className="create-content">
            <div className="preview-container">
              <img
                src={preview}
                alt="Preview"
                className="image-preview"
              />

              <button
                type="button"
                className="remove-image"
                onClick={removeImage}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={2200}
              />

              <div className="caption-count">
                {caption.length}/2200
              </div>

              {error && (
                <p className="create-error">{error}</p>
              )}

              <button
                type="submit"
                className="share-button"
                disabled={loading}
              >
                {loading ? "Sharing..." : "Share"}
              </button>
            </form>
          </div>
        )}

        {!preview && error && (
          <p className="create-error">{error}</p>
        )}
      </div>
    </div>
  );
};

export default CreatePost;