import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ManagerLayout from '../layouts/ManagerLayout';

const ManagerDashboard = () => {
  const [club, setClub] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [dateTime, setDateTime] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        const { data: matches } = await axios.get('https://fantacyleauge.com/api/matches', config);

        // Fetch groups and bets for each match
        const matchesWithBets = await Promise.all(matches.map(async (match) => {
          const { data: groups } = await axios.get(`https://fantacyleauge.com/api/groups/match/${match._id}`, config);
          const hasBets = await Promise.all(groups.map(async (group) => {
            const { data: bets } = await axios.get(`https://fantacyleauge.com/api/bets/group/${group._id}`, config);
            return bets.length > 0;
          }));
          return { ...match, hasBets: hasBets.some(hasBet => hasBet) };
        }));

        setMatches(matchesWithBets);
        setLoading(false);

        if (matches.length > 0) {
          // fetchClub(matches[0].club);
          setClub(matches[0].club)
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch matches');
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);



  // const fetchClub = async (clubId) => {
  //   try {
  //     const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  //     const config = {
  //       headers: {
  //         Authorization: `Bearer ${userInfo.token}`,
  //       },
  //     };

  //     const { data: clubData } = await axios.get(`https://fantacyleauge.com/api/clubs/${clubId}`, config);
  //     setClub(clubData);
  //   } catch (error) {
  //     toast.error(error.response?.data?.message || 'Failed to fetch club details');
  //   }
  // };

  return (
    <ManagerLayout>
      <ToastContainer />
      <img id="Leftbanner1" src="/assets/ManagerBanner.png" alt="MemberBanner" />

      <div class="d-flex justify-content-center align-items-center MainDataTitle my-4" bis_skin_checked="1"><h1>Your Matches ({club.clubName})</h1></div>
      
      {loading ? (
        <p>Loading...</p>
      ) : matches.length === 0 ? (
        <>
          <p className="text-center my-4">No Matches Added To Your Club.</p>

          <div className="ManageBtn W-100 d-flex justify-content-center">
            <button class="bet-button" onClick={() => navigate(`/manager-dashboard/add-match`) }>Add Match</button>
          </div>
        </>

      ) : (
      <>
        <div className="table-responsive ">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Team 1 (123)</th>
                <th>Team 2 (ABC)</th>
                <th>Date & Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match._id}>
                  <td>{match.team1}</td>
                  <td>{match.team2}</td>
                  <td>{new Date(match.dateTime).toLocaleString()}</td>
                  <td>{match.status}</td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ManageBtn W-100 d-flex justify-content-center">
          <button class="bet-button" onClick={() => navigate(`/manager-dashboard/Manage-Matches`) }>Add/Manage Matches</button>
        </div>
      </>
      )}
  
      
    </ManagerLayout>
  );
};

export default ManagerDashboard;