// src/components/GroupList.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MemberLayout from '../layouts/MemberLayout';

const GroupList = () => {
  const [userData, setUserData] = useState(null);
  const [matches, setMatches] = useState([]);
  const { matchId } = useParams();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      };

      const { data: user } = await axios.get(
        'https://fantacyleauge.com/api/users/profile',
        config
      );
      setUserData(user);

      const clubId = typeof user.memberOf === 'object' ? (user.memberOf?._id || user.memberOf?.id) : user.memberOf;
      if (clubId) {
        const { data: matchData } = await axios.get(
          `https://fantacyleauge.com/api/matches/club/${clubId}`,
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

  const fetchGroups = useCallback(async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
        },
      };

      const { data } = await axios.get(`https://fantacyleauge.com/api/groups/match/${matchId}`, config);
      setGroups(data);
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load groups');
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Function to determine prize text based on winnerShare values
  const getPrizeText = (group) => {
    if (group.winnerShare1 > 0 && group.winnerShare2 > 0 && group.winnerShare3 > 0) {
      return "1st, 2nd and 3rd";
    } else if (group.winnerShare1 > 0 && group.winnerShare2 > 0) {
      return "1st and 2nd";
    } else {
      return "1st Prize Only";
    }
  };

  const handlePlaceBet = (groupId) => {
    navigate(`/place-bet/${groupId}`);
  };

  const handleViewBets = (groupId) => {
    navigate(`/view-bets/${groupId}`);
  };

  if (loading) {
    return (
      <MemberLayout clubName={userData?.memberOf?.clubName}>
        <div>Loading...</div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout clubName={userData?.memberOf?.clubName}>
      <ToastContainer />
      <div className="container mt-4">
        <div className="d-flex align-items-center mb-3">
          <button className="btn" onClick={() => navigate(-1)}>←</button>
          <h2 className="mb-0 t-Center W-100">Group</h2>
        </div>
        
        <div className="row">
          {groups.length === 0 ? (
            <p>No groups available for this match.</p>
          ) : (
            groups.map((group, index) => (
              <div key={group._id} className="col-md-6 mb-6">
                <div className="card">
                  <div className="card-body Group-Card">
                    <div className="GroupContentMain">
                      <h5 className="card-title">Group {index + 1}</h5>
                      <p className="card-text"><span className="t-Bold">Bet Type:</span> {group.betType}</p>
                      {group && group.totalBetAmount > -1 && ( // Conditionally display Price Pool
                          <p className="card-text"><span className="t-Bold">Current prize Pool:</span> RS{group.totalBetAmount}</p>
                      )}
                      <p className="card-text"><span className="t-Bold">Bet Amount:</span> RS{group.betAmount}</p>
                      <p className="card-text"><span className="t-Bold">Prizes:</span> {getPrizeText(group)}</p>
                      {group.betType === 'Bidding Method' && (
                        <p className="card-text"><span className="t-Bold">Minimum Increment:</span> RS{group.minimumIncrement}</p>
                      )}
                    </div>
                    <div className="Place-BetButtons">
                      <button
                        className="btn btn-primary me-2"
                        onClick={() => handlePlaceBet(group._id)}
                      >
                        Place Bet
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleViewBets(group._id)}
                      >
                        View Bets
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MemberLayout>
  );
};

export default GroupList;