import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../layouts/AdminLayout';

const AdminManageMatches = () => {
  const { clubId } = useParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
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

        const { data: matches } = await axios.get(`https://fantasyleague7.com/api/matches/club/${clubId}`, config);

        // Fetch groups and bets for each match
        const matchesWithBets = await Promise.all(matches.map(async (match) => {
          const { data: groups } = await axios.get(`https://fantasyleague7.com/api/groups/match/${match._id}`, config);
          const hasBets = await Promise.all(groups.map(async (group) => {
            const { data: bets } = await axios.get(`https://fantasyleague7.com/api/bets/group/${group._id}`, config);
            return bets.length > 0;
          }));
          return { ...match, hasBets: hasBets.some(hasBet => hasBet) };
        }));

        setMatches(matchesWithBets);
        setLoading(false);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch matches');
        setLoading(false);
      }
    };

    fetchMatches();
  }, [clubId]);

  const handleDelete = async (matchId) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        await axios.delete(`https://fantasyleague7.com/api/matches/${matchId}`, config);
        toast.success('Match deleted successfully!');
        setMatches(matches.filter((match) => match._id !== matchId));
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete match');
      }
    }
  };

  const handleApproveCredits = async (matchId) => {
    if (window.confirm('Are you sure you want to share the credits to winners?')) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        await axios.post(
          `https://fantasyleague7.com/api/matches/${matchId}/approve-credits`,
          {},
          config
        );

        toast.success('Credits approved and distributed successfully!');
        // Refresh matches to update the UI
        const { data } = await axios.get(`https://fantasyleague7.com/api/matches/club/${clubId}`, config);
        setMatches(data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to approve credits');
      }
    }
  };

  const handlePlaceBetClick = () => {
    navigate('/admin-dashboard/add-club');
  };

  return (
    <AdminLayout>
      <ToastContainer />
      <div className="container my-5">
        <div className="d-flex align-items-center mb-3">
          <button className="btn" onClick={() => navigate(-1)}>←</button>
          <h2 className="mb-0 t-Center W-100">Manage Matches</h2>
        </div>
        <div className="AddMatchLink">
          <Link to={`/admin-dashboard/manage-club/${clubId}/add-match`} className="btn btn-primary mb-3">
            Add Match
          </Link>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="CardStyleMatches">
              {matches.map((match) => (
                  <div className="card my-2 py-2 MainMatchCard">
                      <div className="MatchCardRow">
                        <div className="teamcol">
                          <div className="TeamNumbers">{match.team1}</div>
                          <div className="Desctag">Team 123</div>
                        </div>

                        <span className="Versus">Vs</span>

                        <div className="teamcol">
                          <div className="TeamAlphabets">{match.team2}</div>
                          <div className="Desctag">Team ABC</div>
                        </div>
                      </div>

                      <div className="MatchCardRow">
                        <div className="MatchDateTime">
                          <p className="DateTime">{new Date(match.dateTime).toLocaleString()}</p>
                          <div className="Desctag">Date & Time</div>
                        </div>
                      </div>

                      <div className="MatchCardRow">
                        <div className="MatchDateTime">
                          <p
                            className="DateTime"
                            style={{
                              color:
                                match.status === "Active"
                                  ? "green"
                                  : match.status === "Inactive"
                                  ? "red"
                                  : match.status === "OnGoing"
                                  ? "blue"
                                  : match.status === "Announced"
                                  ? "orange"
                                  : "black", // Default color
                            }}
                          >
                            {match.status}
                          </p>
                          <div className="Desctag">Status</div>
                        </div>
                      </div>
                      <div className="MatchCardRow">
                        
                          <div className="MachesActions">
                            {!match.hasBets && (
                              <button
                                className="btn btn-sm btn-info me-2"
                                onClick={() => navigate(`/admin-dashboard/Manage-Matches/edit/${match._id}`)}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-warning me-2"
                              onClick={() => navigate(`/admin-dashboard/manage-match/${match._id}`)}
                            >
                              Add/Manage Groups
                            </button>
                            {!match.hasBets && (
                              <button
                                className="btn btn-sm btn-danger me-2"
                                onClick={() => handleDelete(match._id)}
                              >
                                Delete
                              </button>
                            )}
                            {match.status === 'Ongoing' && (
                              <button
                                className="btn btn-sm btn-success me-2"
                                onClick={() => navigate(`/admin-dashboard/Manage-Matches/edit-result/${match._id}`)}
                              >
                                Edit Result
                              </button>
                            )}
                            {match.status !== 'Ongoing' && match.status !== 'Announced' && (
                              <button
                                className="btn btn-sm btn-success me-2"
                                onClick={() => navigate(`/admin-dashboard/Manage-Matches/add-result/${match._id}`)}
                              >
                                Add Result
                              </button>
                            )}
                            {match.status === 'Announced' && (
                              <button
                                className="btn btn-sm btn-primary me-2"
                                onClick={() => navigate(`/admin-dashboard/Manage-Matches/view-result/${match._id}`)}
                              >
                                View Result
                              </button>
                            )}
                            {match.status === 'Ongoing' && !match.prizeShareStatus && (
                              <button
                                className="btn btn-sm btn-success me-2"
                                onClick={() => handleApproveCredits(match._id)}
                              >
                                Approve Credits
                              </button>
                            )}

                            <button
                              className="btn btn-sm btn-secondary me-2"
                              onClick={() => navigate(`/admin-dashboard/Manage-Matches/add-players/${match._id}`)}
                            >
                              {match.Team1Players || match.Team2Players ? 'Edit Players' : 'Add Players'}
                            </button>
                          </div>
                          
                        
                      </div>




                  </div>

              ))}
            </div>
          
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminManageMatches;