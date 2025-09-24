import { useState, useEffect } from "react";
import "./Login.css";
import { getCookie } from "../utils/cookieUtils";

function Login({ setIsLogged }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState(""); // State to hold the token

  useEffect(() => {
    const getCsrfToken = async () => {
      try {
        const response = await fetch("/login/", {
          method: "GET",
          credentials: "include",
        });

        const token = getCookie("csrftoken");
        setCsrfToken(token); // Store it in state for later use
      } catch (error) {
        console.error("Could not fetch CSRF token:", error);
      }
    };

    getCsrfToken();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!csrfToken) {
      alert("Could not verify security token. Please refresh and try again.");
      setLoading(false);
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);
      formData.append("csrfmiddlewaretoken", csrfToken);

      const response = await fetch("/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRFToken": csrfToken,
          "Accept": "application/json",
        },
        body: formData.toString(),
        credentials: "include",
      });

      let data = null;
      try {
        data = await response.json();
      } catch (_) {
        // Fallback to text for debugging
        const txt = await response.text();
        console.error("Non-JSON login response", txt);
      }

      if (response.ok && data && data.ok) {
        sessionStorage.setItem("username", data.username || username);
        setIsLogged(true);
      } else {
        const msg = (data && data.error) ? data.error : `HTTP ${response.status}`;
        console.error("Login failed", msg, data);
        alert("Login failed: " + msg);
      }
    } catch (error) {
      console.error("An error occurred during login:", error);
      alert("An error occurred. Please try again later.");
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading || !csrfToken}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;