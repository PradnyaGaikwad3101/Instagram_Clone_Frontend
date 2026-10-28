
import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import CreatePost from "./pages/CreatePost";
import CreateStory from "./pages/CreateStory";
import CreateReel from "./pages/CreateReel";
import Reels from "./pages/Reels";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Search from "./pages/Search";
import UserProfile from "./pages/UserProfile";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Explore from "./pages/Explore";

const ProtectedLayout = ({ children }) => {
  const token = useSelector((state) => state.auth.token);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <>
      <Navbar />
      <main className="main-content">{children}</main>
    </>
  );
};

const App = () => {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<ProtectedLayout><Home /></ProtectedLayout>} />
        <Route path="/explore" element={<ProtectedLayout><Explore /></ProtectedLayout>} />
        <Route path="/reels" element={<ProtectedLayout><Reels /></ProtectedLayout>} />
        <Route path="/create-reel" element={<ProtectedLayout><CreateReel /></ProtectedLayout>} />
        <Route path="/create" element={<ProtectedLayout><CreatePost /></ProtectedLayout>} />
        <Route path="/create-story" element={<ProtectedLayout><CreateStory /></ProtectedLayout>} />
        <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
        <Route path="/edit-profile" element={<ProtectedLayout><EditProfile /></ProtectedLayout>} />
        <Route path="/search" element={<ProtectedLayout><Search /></ProtectedLayout>} />
        <Route path="/users/:id" element={<ProtectedLayout><UserProfile /></ProtectedLayout>} />
        <Route path="/notifications" element={<ProtectedLayout><Notifications /></ProtectedLayout>} />
        <Route path="/messages" element={<ProtectedLayout><Messages /></ProtectedLayout>} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;