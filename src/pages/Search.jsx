import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiX, FiUsers } from "react-icons/fi";
import api from "../services/api";
import "./Search.css";

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);
    setError("");

    if (!value.trim()) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get("/users/search", {
        params: { username: value.trim() }
      });
      setUsers(response.data.users || []);
    } catch (error) {
      setUsers([]);
      setError(error.response?.data?.message || "Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setUsers([]);
    setError("");
    setLoading(false);
  };

  return (
    <div className="search-page">
      <div className="search-container">
        <h2>Search</h2>

        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search people by username..."
            value={query}
            onChange={handleSearch}
            aria-label="Search users"
          />
          {query && (
            <button
              type="button"
              className="clear-search"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <FiX />
            </button>
          )}
        </div>

        {loading && <p className="search-status">Searching...</p>}
        {error && <p className="search-error">{error}</p>}

        {!query.trim() && (
          <div className="no-results">
            <FiUsers />
            <h3>Find people</h3>
            <p>Search for people to discover their profiles and posts.</p>
          </div>
        )}

        {!loading && query.trim() && users.length === 0 && !error && (
          <div className="no-results">
            <FiSearch />
            <h3>No results found</h3>
            <p>Try searching for another username.</p>
          </div>
        )}

        <div className="search-results">
          {users.map((user) => (
            <button
              type="button"
              className="search-user"
              key={user._id}
              onClick={() => navigate(`/users/${user._id}`)}
            >
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt=""
                  className="search-avatar"
                />
              ) : (
                <div className="search-avatar search-placeholder">
                  {user.username?.charAt(0).toUpperCase() || "U"}
                </div>
              )}

              <div className="search-user-info">
                <strong>{user.username}</strong>
                {user.bio ? (
                  <p>{user.bio}</p>
                ) : (
                  <p className="no-bio">No bio</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Search;