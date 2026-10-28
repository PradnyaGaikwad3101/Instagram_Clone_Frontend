
import React, { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiHome, FiSearch, FiCompass, FiPlusSquare, FiMessageCircle,
  FiHeart, FiUser, FiMenu, FiPlayCircle, FiLogOut, FiSun, FiMoon
} from "react-icons/fi";
import { FaInstagram } from "react-icons/fa";
import { logout } from "../redux/authSlice";
import api from "../services/api";
import "./Navbar.css";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useSelector((state) => state.auth.user);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await api.get("/notifications");
      const notifications = response.data.notifications || [];
      setUnreadCount(notifications.filter((notification) => !notification.read).length);
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to fetch notifications");
    }
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, location.pathname]);

  useEffect(() => {
    const handleFocus = () => fetchNotifications();
    const handleNotificationUpdate = () => fetchNotifications();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("notifications-updated", handleNotificationUpdate);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("notifications-updated", handleNotificationUpdate);
    };
  }, [fetchNotifications]);

  const handleLogout = () => {
    setShowMore(false);
    setUnreadCount(0);
    dispatch(logout());
    navigate("/login");
  };

  const toggleTheme = () => {
    setTheme((previous) => previous === "light" ? "dark" : "light");
    setShowMore(false);
  };

  const navigateFromMenu = (path) => {
    setShowMore(false);
    navigate(path);
  };

  return (
    <aside className="navbar">
      <div
        className="navbar-logo"
        onClick={() => navigateFromMenu("/home")}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter") navigateFromMenu("/home");
        }}
      >
        <FaInstagram className="instagram-icon" />
        <span>Instagram</span>
      </div>

      <nav className="navbar-links">
        <NavLink to="/home" className="nav-link"><FiHome /><span>Home</span></NavLink>
        <NavLink to="/search" className="nav-link"><FiSearch /><span>Search</span></NavLink>
        <NavLink to="/explore" className="nav-link"><FiCompass /><span>Explore</span></NavLink>
        <NavLink to="/reels" className="nav-link"><FiPlayCircle /><span>Reels</span></NavLink>
        <NavLink to="/create" className="nav-link"><FiPlusSquare /><span>Create</span></NavLink>
        <NavLink to="/messages" className="nav-link"><FiMessageCircle /><span>Messages</span></NavLink>
        <NavLink to="/notifications" className="nav-link">
          <div className="nav-icon-wrapper">
            <FiHeart />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </div>
          <span>Notifications</span>
        </NavLink>
        <NavLink to="/profile" className="nav-link"><FiUser /><span>Profile</span></NavLink>
      </nav>

      <div className="navbar-bottom">
        <div className="more-wrapper">
          {showMore && (
            <>
              <button
                className="more-menu-backdrop"
                aria-label="Close menu"
                onClick={() => setShowMore(false)}
              />
              <div className="more-menu">
                <button onClick={toggleTheme}>
                  {theme === "light" ? <FiMoon /> : <FiSun />}
                  <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
                </button>
                <button onClick={() => navigateFromMenu("/create-story")}>
                  <FiPlayCircle /><span>Create Story</span>
                </button>
                <button onClick={handleLogout}>
                  <FiLogOut /><span>Logout</span>
                </button>
              </div>
            </>
          )}

          <button
            className="more-button"
            onClick={() => setShowMore((previous) => !previous)}
            aria-expanded={showMore}
          >
            <FiMenu /><span>More</span>
          </button>
        </div>

        {currentUser && (
          <div className="navbar-user">
            {currentUser.profileImage ? (
              <img src={currentUser.profileImage} alt={currentUser.username || "Profile"} />
            ) : (
              <div className="navbar-user-placeholder">
                {currentUser.username?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <span>@{currentUser.username}</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Navbar;