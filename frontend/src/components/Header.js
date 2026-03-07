import React, { useState, useEffect } from 'react';
// import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Header.css';

const Header = () => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const navigate = useNavigate();

  // const storedUser = JSON.parse(localStorage.getItem('userInfo'));

  // State for user credits
  const [credits, setCredits] = useState(userInfo?.credits || 0);

  useEffect(() => {
    const fetchCredits = async () => {
      if (userInfo?._id) {
        try {
          const userInfo = JSON.parse(localStorage.getItem('userInfo'));
          const config = {
            headers: {
              Authorization: `Bearer ${userInfo.token}`,
            },
          };

          const { data } = await axios.get(`https://fantasyleague7.com/api/users/userdetails/${userInfo._id}`, config);
          setCredits(data.credits);
        } catch (error) {
          console.error("Error fetching user credits", error);
        }
      }
    };

    fetchCredits();
  }, [userInfo]);
  

  // const handleSignout = () => {
  //   localStorage.removeItem('userInfo');
  //   navigate('/login');
  // };

  return (
    <nav className="navbar navbar-expand-lg custom-navbar">
      <div className="container NavigationContainerMain">
        {/* Brand Logo */}
        <a className="navbar-brand" href="/">
          <img id="headerLogo" src="/assets/Fantasy-Logo.png" alt="Fantasy League Logo"/>
        </a>

        {/* Toggler Button for Small Screens */}
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navbar Links */}
        <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
          <ul className="navbar-nav align-items-center">
            {userInfo ? (
              <>
                {/* Conditional menu based on userType */}
                {userInfo.userType === "Manager" && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/manager-dashboard">Dashboard</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/manager-dashboard/Manage-Matches">Manage Matches</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/manager-dashboard/manage-members">Manage Members</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/manager-dashboard/wallet-history">Wallet History</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/change-password">Change Password</Link>
                    </li>
                  </>
                )}

                {userInfo.userType === "Admin" && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/admin-dashboard">Dashboard</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/admin-dashboard/manage-club">Manage Clubs</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/admin-dashboard/wallet-history">Wallet History</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/change-password">Change Password</Link>
                    </li>
                  </>
                )}

                {userInfo.userType === "Member" && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/dashboard">Dashboard</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/dashboard/referral">
                        <i className="bi bi-people-fill me-2"></i>Referral Program
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/dashboard/my-bets">My Bets</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/dashboard/wallet-history">Wallet History</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link text-dark" to="/change-password">Change Password</Link>
                    </li>
                  </>
                )}

                {/* Display user's name and profile picture */}
                <li className="nav-item d-flex justify-content-center align-items-center">
                  <span id="ProfileNameheader" className="nav-link">{userInfo.firstName} ( RS{credits} )</span>
                  <img id="profileImage" src="/assets/default-profile.jpg" alt="Profile" />
                </li>

                {/* Sign Out Button
                <li className="nav-item d-flex justify-content-center">
                  <button className="btn btn-link nav-link" onClick={handleSignout}>Sign Out</button>
                </li> */}
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="btn btn-primary mx-2 " to="/login">Sign In</Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-warning my-2" to="/register">Register</Link>
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
