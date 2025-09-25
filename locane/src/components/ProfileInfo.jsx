import { useEffect, useState } from "react";
import dp from "../assets/dp.jpg";
import "./ProfileInfo.css";

function ProfileInfo({ isCollapsed }) {
  const loginkey = sessionStorage.getItem("username"); // Use sessionStorage for username

  return (
    <div className="profile-info">
      <div className="profile-img-wrapper">
        <img src={dp} alt="Profile Picture" />
      </div>
      {!isCollapsed && <label className="profile-name">{loginkey || "Loading..."}</label>}
    </div>
  );
}

export default ProfileInfo;