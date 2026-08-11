import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Header.css';

const Header = () => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const navigate = useNavigate();

  // State for user credits
  const [credits, setCredits] = useState(userInfo?.credits || 0);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);

  const handleNavCollapse = () => setIsNavCollapsed(!isNavCollapsed);
  const closeNav = () => setIsNavCollapsed(true);

  useEffect(() => {
    const fetchCredits = async () => {
      if (userInfo?._id) {
        try {
          const userInfoData = JSON.parse(localStorage.getItem('userInfo'));
          const config = {
            headers: {
              Authorization: `Bearer ${userInfoData.token}`,
            },
          };

          const { data } = await axios.get(`/api/users/userdetails/${userInfoData._id}`, config);
          setCredits(data.credits);
        } catch (error) {
          console.error("Error fetching user credits", error);
        }
      }
    };

    fetchCredits();
  }, [userInfo?._id]);

  return (
    <nav className="navbar navbar-expand-lg custom-navbar">
      <div className="container NavigationContainerMain">
        {/* Brand Logo */}
        <Link className="navbar-brand" to="/" onClick={closeNav}>
          <img id="headerLogo" src="/assets/Fantasy-Logo.png" alt="Fantasy League Logo"/>
        </Link>

        {/* Toggler Button for Small Screens */}
        <button 
          className="navbar-toggler" 
          type="button" 
          aria-controls="navbarNav"
          aria-expanded={!isNavCollapsed}
          aria-label="Toggle navigation"
          onClick={handleNavCollapse}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navbar Links */}
        <div className={`collapse navbar-collapse justify-content-end ${isNavCollapsed ? '' : 'show'}`} id="navbarNav">
          <ul className="navbar-nav align-items-center">
            {userInfo ? (
              <>
                {/* Conditional menu based on userType */}
                {userInfo.userType === "Manager" && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/manager-dashboard" onClick={closeNav}>Dashboard</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/manager-dashboard/Manage-Matches" onClick={closeNav}>Manage Matches</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/manager-dashboard/manage-members" onClick={closeNav}>Manage Members</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/manager-dashboard/wallet-history" onClick={closeNav}>Wallet History</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/change-password" onClick={closeNav}>Change Password</Link>
                    </li>
                  </>
                )}

                {userInfo.userType === "Admin" && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/admin-dashboard" onClick={closeNav}>Dashboard</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/admin-dashboard/manage-club" onClick={closeNav}>Manage Clubs</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/admin-dashboard/wallet-history" onClick={closeNav}>Wallet History</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/change-password" onClick={closeNav}>Change Password</Link>
                    </li>
                  </>
                )}

                {userInfo.userType === "Member" && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/dashboard" onClick={closeNav}>Dashboard</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/dashboard/referral" onClick={closeNav}>
                        <i className="bi bi-people-fill me-2"></i>Referral Program
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/dashboard/my-bets" onClick={closeNav}>My Bets</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/dashboard/wallet-history" onClick={closeNav}>Wallet History</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/change-password" onClick={closeNav}>Change Password</Link>
                    </li>
                  </>
                )}

                {/* Display user's name and profile picture */}
                <li className="nav-item d-flex justify-content-center align-items-center">
                  <span id="ProfileNameheader" className="nav-link">{userInfo.firstName} ( RS{credits} )</span>
                  <img id="profileImage" src="/assets/default-profile.jpg" alt="Profile" />
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="btn btn-primary mx-2 " to="/login" onClick={closeNav}>Sign In</Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-warning my-2" to="/register" onClick={closeNav}>Register</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Header;
