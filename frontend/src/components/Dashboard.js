import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MemberLayout from '../layouts/MemberLayout';
import { useNavigate, useLocation } from 'react-router-dom';


const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All Games');
  const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');

    if (tab === 'live') {
      setActiveTab('Live match'); // Set "Live match" tab if ?tab=live exists
    }
    
    fetchUserData();
  }, [location.search]);

  const fetchUserData = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      };

      const { data: user } = await axios.get(
        'https://fantasyleague7.com/api/users/profile',
        config
      );
      setUserData(user);

      if (user.memberOf && user.memberOf._id) {
        const { data: matchData } = await axios.get(
          `https://fantasyleague7.com/api/matches/club/${user.memberOf._id}`,
          config
        );
        setMatches(matchData);
      }

      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
      setLoading(false);
    }
  };

  const handlePlayClick = (matchId) => {
    navigate(`/play-match/${matchId}`);
  };

  const filterMatches = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return matches
      .filter((match) => {
        const matchDate = new Date(match.dateTime);
        matchDate.setHours(0, 0, 0, 0);

        switch (activeTab) {
          case 'All Games':
            return matchDate >= today;
          case 'Live match':
            return matchDate.getTime() === today.getTime();
          case 'Inactive':
            return match.status === 'Inactive';
          case 'Finished':
            return match.status === 'Announced';
          default:
            return true;
        }
      })
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  };

  if (loading) {
    return (
      <MemberLayout>
        <div>Loading...</div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout clubName={userData?.memberOf?.clubName}>
      <ToastContainer />

      <img id="Leftbanner1" src="/assets/MemberBanner.png" alt="MemberBanner" />

      <div className="container mt-4 MainContenttableCont">
        <div className="d-flex justify-content-center align-items-center MainDataTitle">
          <h1>{userData?.memberOf?.clubName || 'Club Dashboard'}</h1>
        </div>

        {/* Tab Navigation */}
        <ul className="nav nav-tabs mt-3" style={{ borderBottom: '1px solid #000' }}>
          {['All Games', 'Live match', 'Inactive', 'Finished'].map((tab) => (
            <li className="nav-item" key={tab}>
              <button
                className={`nav-link ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                style={{
                  color: activeTab === tab ? '#000' : '#000',
                  backgroundColor: activeTab === tab ? '#FFD700' : 'transparent',
                  border: '1px solid #000',
                  borderBottom: activeTab === tab ? '1px solid #000' : 'none',
                }}
              >
                {tab}
              </button>
            </li>
          ))}
        </ul>

        {/* Matches Header with Borders */}
        <h3
          className=" text-center"
          style={{
            display: 'inline-block',
            borderLeft: '1px solid #000',
            borderRight: '1px solid #000',
            width:'100%',
            marginBottom: '0px',
            fontSize: '16px',
            padding: '20px 0px',
            
          }}
        >
          Matches
        </h3>

        {/* Table with Left, Right, and Bottom Borders */}
        <div className="table-responsive mainMatchtable">
          <table
            className="table PlayMatchTable"
            style={{
              borderLeft: '1px solid #000',
              borderRight: '1px solid #000',
              borderBottom: '1px solid #000',
            }}
          >
            <thead>
              <tr>
                <th scope="col">Date & Time</th>
                <th scope="col">Match</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filterMatches().length === 0 ? (
                <tr className="d-flex align-items-center">
                  <td colSpan="4" className="text-center">
                    No matches available.
                  </td>
                </tr>
              ) : (
                filterMatches().map((match) => (
                  <tr key={match._id}>
                    <td>{new Date(match.dateTime).toLocaleString()}</td>
                    <td>
                      {match.team1} vs {match.team2}
                    </td>
                    <td>{match.status}</td>
                    <td>
                      {match.status === 'Active' ? (
                        <button
                          className="btn btn-primary MatchPlyBtn"
                          onClick={() => handlePlayClick(match._id)}
                        >
                          Play
                        </button>
                      ) : match.status === 'Announced' ? (
                        <button
                          className="btn btn-secondary MatchPlyBtn"
                          onClick={() => navigate(`/match-result/${match._id}`)}
                        >
                          View Result
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MemberLayout>
  );
};

export default Dashboard;
