
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCamera, FiLock } from "react-icons/fi";
import api from "../services/api";
import { updateUser } from "../redux/authSlice";
import "./EditProfile.css";

const EditProfile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    isPrivate: false,
  });
  const [profileImage, setProfileImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      try {
        const response = await api.get("/users/profile");
        if (!active) return;

        const user = response.data.user;
        setFormData({
          username: user.username || "",
          bio: user.bio || "",
          isPrivate: Boolean(user.isPrivate),
        });
        setPreview(user.profileImage || "");
      } catch (error) {
        if (active) {
          setError(error.response?.data?.message || "Failed to load profile");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
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
    setProfileImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handlePrivacyChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      isPrivate: e.target.checked,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setError("");

      const data = new FormData();
      data.append("username", formData.username.trim());
      data.append("bio", formData.bio);
      data.append("isPrivate", String(formData.isPrivate));

      if (profileImage) data.append("profileImage", profileImage);

      const response = await api.put("/users/profile", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      dispatch(updateUser(response.data.user));
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/profile", { replace: true });
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="edit-loading">Loading...</div>;

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-card">
        <div className="edit-profile-header">
          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/profile")}
            aria-label="Back to profile"
          >
            <FiArrowLeft />
          </button>
          <h2>Edit Profile</h2>
          <div className="header-space" />
        </div>

        <div className="edit-profile-body">
          <div className="edit-image-section">
            <div className="edit-image-wrapper">
              {preview ? (
                <img
                  src={preview}
                  alt="Profile preview"
                  className="edit-profile-image"
                />
              ) : (
                <div className="edit-profile-image edit-placeholder">
                  {formData.username.charAt(0).toUpperCase()}
                </div>
              )}

              <label className="camera-button" aria-label="Choose profile photo">
                <FiCamera />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  hidden
                />
              </label>
            </div>

            <label className="change-photo">
              Change profile photo
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />
            </label>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="edit-username">Username</label>
            <input
              id="edit-username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              maxLength={30}
            />

            <label htmlFor="edit-bio">Bio</label>
            <textarea
              id="edit-bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              maxLength={150}
              placeholder="Write something about yourself..."
            />

            <div className="bio-count">{formData.bio.length}/150</div>

            <div className="privacy-setting">
              <div className="privacy-setting-info">
                <FiLock className="privacy-icon" />
                <div>
                  <strong>Private Account</strong>
                  <p>
                    Only approved followers can see your posts.
                  </p>
                </div>
              </div>

              <label className="privacy-toggle">
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={handlePrivacyChange}
                  aria-label="Private Account"
                />
                <span className="privacy-toggle-slider" />
              </label>
            </div>

            {error && <p className="edit-error">{error}</p>}

            <button
              type="submit"
              className="save-profile-button"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;