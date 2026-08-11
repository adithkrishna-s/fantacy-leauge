// src/components/MatchResult.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ManagerLayout from '../layouts/ManagerLayout';
import { useParams } from 'react-router-dom';

const ManagerMatchResult = () => {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      // Fetch match details
      const { data: matchData } = await axios.get(`/api/matches/${matchId}`, config);
      setMatch(matchData);

      // Fetch groups for the match
      const { data: groupsData } = await axios.get(`/api/groups/match/${matchId}`, config);

      // Fetch winners for each group
      const groupsWithWinners = await Promise.all(
        groupsData.map(async (group) => {
          const winners = await fetchWinnersByGroup(group._id);
          return { ...group, winners }; // Add winners to the group object
        })
      );

      setGroups(groupsWithWinners); // Update groups state with winners
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load match details');
      setLoading(false);
    }
  };

  const fetchWinnersByGroup = async (groupId) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      const { data: winnersData } = await axios.get(`/api/winners/group/${groupId}`, config);
      return winnersData;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load winners');
      return null;
    }
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div>Loading...</div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <ToastContainer />
      <div className="dashboard-content">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Match Result: {match.team1} vs {match.team2}</h5>
            {groups.map((group) => (
              <div key={group._id} className="mb-4">
                <h6>Group {group._id}</h6>
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Full Name</th>
                      <th>Combination</th>
                      <th>Score</th>
                      <th>Amount Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.winners?.firstWinners?.map((winner, index) => (
                      <tr key={index}>
                        <td>1st</td>
                        <td>{winner.user?.firstName} {winner.user?.lastName}</td>
                        <td>{winner.combination}</td>
                        <td>{winner.score}</td>
                        <td>RS{winner.amountWon.toFixed(2)}</td>
                      </tr>
                    ))}
                    {group.winners?.secondWinners?.map((winner, index) => (
                      <tr key={index}>
                        <td>2nd</td>
                        <td>{winner.user?.firstName} {winner.user?.lastName}</td>
                        <td>{winner.combination}</td>
                        <td>{winner.score}</td>
                        <td>RS{winner.amountWon.toFixed(2)}</td>
                      </tr>
                    ))}
                    {group.winners?.thirdWinners?.map((winner, index) => (
                      <tr key={index}>
                        <td>3rd</td>
                        <td>{winner.user?.firstName} {winner.user?.lastName}</td>
                        <td>{winner.combination}</td>
                        <td>{winner.score}</td>
                        <td>RS{winner.amountWon.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
};

export default ManagerMatchResult;