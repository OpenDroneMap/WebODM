import { useEffect, useState } from "react";
import dp from "../assets/dp.jpg";
import "./ProfileInfo.css";
import { authorizedFetch } from "../utils/api";
import { getCookie } from "../utils/cookieUtils";

const API_BASE = "/api";

function ProfileInfo() {
  const [user, setUser] = useState(null);

  const loginkey = sessionStorage.getItem("username"); // Use sessionStorage for username

  useEffect(() => {
    async function fetchUsersAndFilter() {
      try {
        const response = await authorizedFetch(`${API_BASE}/admin/users/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"), // Include CSRF token in headers
          },
        });

        if (!response.ok) {
          console.error("Failed to fetch users:", response.statusText);
          return;
        }

        const data = await response.json();
        const users = Array.isArray(data) ? data : data.results || [];

        const foundUser = users.find(
          (u) =>
            u?.username?.toLowerCase() === loginkey?.toLowerCase() ||
            u?.email?.toLowerCase() === loginkey?.toLowerCase()
        );

        if (foundUser) {
          setUser(foundUser);
        } else {
          console.warn("No user found with username or email:", loginkey);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }

    fetchUsersAndFilter();
  }, [loginkey]);

  return (
    <div className="profile-info">
      <div className="profile-img-wrapper">
        <img src={dp} alt="Profile Picture" />
      </div>
      <label className="profile-name">
        {user ? user.username : "Loading..."}
      </label>
    </div>
  );
}

export default ProfileInfo;