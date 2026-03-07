import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../layouts/AdminLayout';

const AdminManageMatch = () => {
  const { matchId } = useParams();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        const { data: groups } = await axios.get(`https://fantasyleague7.com/api/groups/match/${matchId}`, config);

        // Fetch bets for each group
        const groupsWithBets = await Promise.all(groups.map(async (group) => {
          const { data: bets } = await axios.get(`https://fantasyleague7.com/api/bets/group/${group._id}`, config);
          return { ...group, hasBets: bets.length > 0 };
        }));

        setGroups(groupsWithBets);
        setLoading(false);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch groups');
        setLoading(false);
      }
    };

    fetchGroups();
  }, [matchId]);

  const handleDelete = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        await axios.delete(`https://fantasyleague7.com/api/groups/${groupId}`, config);
        setGroups(groups.filter(group => group._id !== groupId));
        toast.success('Group deleted successfully');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete group');
      }
    }
  };

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

  return (
    <AdminLayout>
      <ToastContainer />
      <div className="container my-5">
        <div className="d-flex align-items-center mb-3">
          <button className="btn" onClick={() => navigate(-1)}>←</button>
          <h2 className="mb-0 t-Center W-100">Manage Groups</h2>
        </div>

        <div className="AddMatchLink">
          <button
            className="btn btn-primary mb-3"
            onClick={() => navigate(`/admin-dashboard/add-group/${matchId}`)}
          >
            Add/Manage Group
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="CardStyleMatches">
              {groups.map((group, index) => (
                <div className="card my-3 p-2 MainMatchCard" key={group._id}>
                  <div className="MatchCardRow">
                    <div className="teamcol">
                      <div className="TeamNumbers">Group {index + 1}</div>
                      <div className="Desctag">Group Number</div>
                    </div>
                  </div>
                  <div className="MatchCardRow">
                    <div className="teamcol">
                      <p className="DateTime">{group.betType}</p>
                      <div className="Desctag">Group Type</div>
                    </div>
                    <div className="teamcol">
                      <p className="DateTime">{group.betAmount}</p>
                      <div className="Desctag">Bet Amount</div>
                    </div>
                  </div>
                  <div className="MatchCardRow">
                    <div className="teamcol">
                      <p className="DateTime">{getPrizeText(group)}</p>
                      <div className="Desctag">Prizes</div>
                    </div>
                    <div className="teamcol">
                      <p
                        className="DateTime"
                        style={{
                          color:
                            group.status === "Active"
                              ? "green"
                              : group.status === "Inactive"
                              ? "red"
                              : "black",
                        }}
                      >
                      {group.status}
                      </p>
                      <div className="Desctag">Status</div>
                    </div>
                  </div>
                  <div className="MatchCardRow">
                    <div className="MachesActions">
                      {!group.hasBets && (
                        <button
                          className="btn btn-sm btn-info me-2"
                          onClick={() => navigate(`/admin-dashboard/edit-group/${group._id}`)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => navigate(`/admin-dashboard/view-bets/${group._id}`)}
                      >
                        View Bets
                      </button>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => navigate(`/admin-dashboard/view-bettingsheet/${group._id}`)}
                      >
                        Betting Sheet
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(group._id)}
                      >
                        Delete
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

export default AdminManageMatch;