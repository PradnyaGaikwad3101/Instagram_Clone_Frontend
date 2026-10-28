import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiImage, FiX } from "react-icons/fi";

import api from "../services/api";
import "./CreateStory.css";

const CreateStory = () => {
  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
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
    setError("");
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

      await api.post("/stories", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      navigate("/home");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to create story"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-story-page">
      <div className="create-story-card">
        <div className="create-story-header">
          <h2>Create Story</h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="create-story-form"
        >
          {!preview ? (
            <label
              htmlFor="story-image"
              className="story-upload-area"
            >
              <FiImage />

              <h3>Choose a photo</h3>

              <p>
                Share a photo to your story
              </p>

              <span>Select from computer</span>

              <input
                id="story-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>
          ) : (
            <div className="story-preview-wrapper">
              <img
                src={preview}
                alt="Story preview"
                className="story-preview"
              />

              <button
                type="button"
                className="remove-story-image"
                onClick={removeImage}
              >
                <FiX />
              </button>
            </div>
          )}

          {error && (
            <p className="create-story-error">
              {error}
            </p>
          )}

          {preview && (
            <button
              type="submit"
              className="share-story-button"
              disabled={loading}
            >
              {loading ? "Sharing..." : "Share to story"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateStory;