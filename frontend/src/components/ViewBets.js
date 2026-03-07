// src/components/ViewBets.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MemberLayout from '../layouts/MemberLayout';

const ViewBets = () => {
  const [userData, setUserData] = useState(null);
  const [matches, setMatches] = useState([]);
  const { groupId } = useParams();
  const [bets, setBets] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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


  useEffect(() => {
    const fetchData = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            'Authorization': `Bearer ${userInfo.token}`,
          },
        };

        // Fetch bets
        const { data: betsData } = await axios.get(`https://fantasyleague7.com/api/bets/group/${groupId}`, config);
        setBets(betsData);

        // Fetch group details
        const { data: groupData } = await axios.get(`https://fantasyleague7.com/api/groups/${groupId}`, config);
        setGroup(groupData);

        setLoading(false);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load data');
        setError(error.response?.data?.message || 'Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId]);

  if (loading) {
    return (
      <MemberLayout clubName={userData?.memberOf?.clubName}>
        <div>Loading...</div>
      </MemberLayout>
    );
  }

  if (error) {
    return (
      <MemberLayout clubName={userData?.memberOf?.clubName}>
        <div className="container mt-4">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout clubName={userData?.memberOf?.clubName}>
      <ToastContainer />
      <div className="container mt-4">
        <div className="d-flex align-items-center mb-3">
          <button className="btn" onClick={() => navigate(-1)}>←</button>
          <h2 className="mb-0 t-Center W-100">View Bets</h2>
        </div>
        {group && group.totalBetAmount > 50 && ( // Conditionally display Price Pool
          <div className="text-center mb-4">
            <h4>Price Pool: RS{group.totalBetAmount}</h4>
          </div>
        )}
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Combination</th>
              <th>Bet Amount</th>
              <th>Bet Creation Date</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {bets.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center">No bets placed in this group.</td>
              </tr>
            ) : (
              bets.map((bet) => (
                <tr key={bet._id}>
                  <td>{bet.combination}</td>
                  <td>RS{bet.betAmount}</td>
                  <td>{new Date(bet.createdAt).toLocaleString()}</td>
                  <td>{bet.result || 'TBA'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </MemberLayout>
  );
};

export default ViewBets;