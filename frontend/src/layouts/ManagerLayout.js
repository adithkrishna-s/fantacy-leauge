import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/dashboards.css"

const ManagerLayout = ({ children }) => {
  const [clubName, setClubName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClubName = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        if (!userInfo) {
          navigate("/login");
          return;
        }

        const config = {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        };

        // Fetch user details
        const { data: user } = await axios.get(
          "https://fantacyleauge.com/api/users/profile",
          config
        );

        // Fetch all clubs
        const { data: clubs } = await axios.get(
          "https://fantacyleauge.com/api/clubs",
          config
        );

        // Find the club where the user is a member
        const userClub = clubs.find((club) => club.user._id === user._id);

        if (userClub) {
          setClubName(userClub.clubName);
        } else {
          setClubName("MyClub");
        }
      } catch (error) {
        console.error("Error fetching club:", error);
      }
    };

    fetchClubName();
  }, [navigate]);


  const handleSignout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const handlePlaceBetClick = () => {
    navigate('/manager-dashboard/add-match');
  };

  return (
    <div id="maindashboardcontainer" className="container-fluid">
      <div className="row">
        {/* Sidebar */}
        <div className="col-md-3 text-dark p-4 LeftSidebarWhole">
          <div className="DashLeftSide1">
            <img id="Leftbanner1" src="/assets/FantacyLeftbanner.jpeg" alt="LeftbannerAd" />
          </div>

          {/* <div className="HighestWinnings my-4">
            <div className="card">
              <div className="card-header text-center SideCompTitle">
                  <h4>Highest Winning</h4>
              </div>
              <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between align-items-center highestwinli">
                      RS 5000
                      <a href="/" className="btn btn-link highestwinLink">View</a>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center highestwinli">
                      RS 4000
                      <a href="/" className="btn btn-link highestwinLink">View</a>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center highestwinli">
                      RS 3678
                      <a href="/" className="btn btn-link highestwinLink">View</a>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center highestwinli">
                      RS 2356
                      <a href="/" className="btn btn-link highestwinLink">View</a>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center highestwinli">
                      RS 1000
                      <a href="/" className="btn btn-link highestwinLink">View</a>
                  </li>
              </ul>
              <div className="card-footer text-center">
                  <a href="/" className="btn btn-warning btn-block highestwinSeebtn">See All</a>
              </div>
            </div>
          </div> */}
        </div>

        {/* Main content */}
        <div className="col-md-6 p-4">
          {children}
        </div>

        {/* Sidebar */}
        <div className="col-md-3 text-dark p-4">
          <div className="HighestWinnings">
            <div className="card">
              <div className="card-header text-center SideCompTitle">
                  <h4>Popular Live Match</h4>
              </div>
              <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-center align-items-center highestwinli">
                    <div className="RightCardcard">
                      <div className="logo-container container my-3">
                        <div className="row">
                            <div className="col-5 d-flex justify-content-center align-items-center">
                                <img 
                                    id="Leftteamimg"
                                    src="/assets/Chennai-Super-kings.jpeg" 
                                    className="team-logo img-fluid rounded-circle" 
                                    alt="Chennai Super Kings" 
                                />
                            </div>
                            <div className="col-2 d-flex justify-content-center align-items-center">
                                <span className="live-badge">Live</span>
                            </div>
                            <div className="col-5 d-flex justify-content-center align-items-center">
                                <img 
                                    id="Rightteamimg"
                                    src="/assets/Kolkata-knight-Riders.jpeg" 
                                    className="team-logo img-fluid rounded-circle" 
                                    alt="Kolkata Knight Riders" 
                                />
                            </div>
                        </div>
                      </div>
                      {/* <div className="winnings-text">
                          <h5>Total Winnings : $5000</h5>
                      </div> */}
                      <button className="bet-button" onClick={handlePlaceBetClick}>Create Match</button>
                    </div>
                  </li>
                  
              </ul>
            </div>

            {/* <div className="card my-4">
              <div className="card-header text-center SideCompTitle">
                  <h4>{clubName}</h4>
              </div>

              <ul className="list-group list-group-flush">
                <li className="list-group-item align-items-center highestwinli">
                  <p className="primaryPrice">RS50000 Lakh Prize pool</p>

                  <p>Winner-Takes-All - RS50000 Lakh Grand Prize</p>
                  
                </li>
                <li className="list-group-item d-flex justify-content-center align-items-center highestwinli">
                  <button className="bet-button" onClick={handlePlaceBetClick}>Create Match</button>
                </li>
              </ul>
            </div> */}
          </div>

          {/* Sign Out Button */}
          <ul>
            <li className="nav-item d-flex justify-content-center">
              <button className="btn btn-link nav-link LogouTBtn" onClick={handleSignout}>
                  Log Out
                  <svg  className="mx-2" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" fill="none">
                    <mask id="mask0_367_3384" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="25" height="25">
                      <rect x="24.6016" y="0.916992" width="24" height="24" transform="rotate(90 24.6016 0.916992)" fill="#D9D9D9" />
                    </mask>
                    <g mask="url(#mask0_367_3384)">
                      <path d="M18.7766 11.917L14.2016 7.31699L15.6016 5.91699L22.6016 12.917L15.6016 19.917L14.1766 18.517L18.7766 13.917L11.6016 13.917V11.917L18.7766 11.917ZM6.60156 11.917H9.60156V13.917H6.60156V11.917ZM2.60156 11.917L4.60156 11.917L4.60156 13.917H2.60156L2.60156 11.917Z" fill="#D81541" />
                    </g>
                  </svg>
              </button>
            </li>
          </ul>

        </div>

      </div>
    </div>
  );
};

export default ManagerLayout;
