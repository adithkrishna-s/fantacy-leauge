import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import AdminLayout from "../layouts/AdminLayout";
import axios from "axios";
import { Link } from "react-router-dom";

const ManageClubs = () => {
    const navigate = useNavigate();
    const [clubs, setClubs] = useState([]);

  // Fetch clubs from the API
  useEffect(() => {
    // Check if user is logged in and is admin
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || userInfo.userType !== 'Admin') {
      navigate('/login');
      return;
    }

    const fetchClubs = async () => {
        const config = {
            headers: {
                'Authorization': `Bearer ${userInfo.token}`,
            },
        };
        try {
            const response = await axios.get("/api/clubs", config);
            setClubs(response.data);
            } catch (error) {
            console.error("Error fetching clubs:", error);
        }
    };
    fetchClubs();
  }, [navigate]);

  // Delete club function
  const handleDelete = async (clubId) => {
    if (!window.confirm("Are you sure you want to delete this club?")) return;
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userInfo.token}`
            }
        };

      await axios.delete(`/api/clubs/${clubId}`, config);
      setClubs(clubs.filter((club) => club._id !== clubId));
    } catch (error) {
      console.error("Error deleting club:", error);
      const message =
        error.response?.data?.message ||
        "Failed to delete club. Please try again.";
      window.alert(message);
    }
  };

  return (
    <AdminLayout>
      <div className="container mt-4">
        <div className="d-flex align-items-center mb-3">
          <button className="btn" onClick={() => navigate(-1)}>←</button>
          <h2 className="mb-0 t-Center W-100">Manage Clubs</h2>
        </div>

        <div className="AddMatchLink">
          <Link to={`/admin-dashboard/add-club`} className="btn btn-primary mb-3">
            Add Club
          </Link>
        </div>

        <div className="CardStyleMatches">
          {clubs.length > 0 ? (
            clubs.map((club, index) => (
              <div className="card my-2 py-2 MainMatchCard" key={club._id}>
                <div className="MatchCardRow">
                  <div className="teamcol">
                    <div className="TeamNumbers">{club.clubName}</div>
                    <div className="Desctag">Club Name</div>
                  </div>
                </div>

                <div className="MatchCardRow">
                  <div className="MatchDateTime">
                    <p className="DateTime">{club.user ? `${club.user.firstName} ${club.user.lastName}` : "N/A"}</p>
                    <div className="Desctag">Manager Name</div>
                  </div>
                </div>

                <div className="MatchCardRow">
                  <div className="MatchDateTime">
                    <p className="DateTime">{club.user ? club.user.email : "N/A"}</p>
                    <div className="Desctag">Manager Email</div>
                  </div>
                </div>

                <div className="MatchCardRow">
                  
                    <div className="MachesActions">
                      <Link to={`/admin-dashboard/edit-club/${club._id}`} className="btn btn-sm btn-primary me-2">
                        Edit
                      </Link>
                      <Link to={`/admin-dashboard/manage-club/${club._id}`} className="btn btn-sm btn-warning me-2">
                        Add/Manage Match
                      </Link>
                      <button onClick={() => handleDelete(club._id)} className="btn btn-sm btn-danger me-2">
                        Delete
                      </button>

                      <Link to={`/admin-dashboard/manage-members/${club._id}`} className="btn btn-sm btn-primary me-2">
                        Manage Members
                      </Link>
                    </div>
                    
                  
                </div>




              </div>
            ))
          ) : (
            <div className="card my-2 py-2 MainMatchCard" >
                <div className="MatchCardRow">
                  <div className="teamcol">
                    <div className="TeamNumbers">No clubs found.</div>
                    <div className="Desctag">You Have No Clubs Yet.</div>
                  </div>
                </div>
            </div>
            
          )}

        </div>
        


      </div>
    </AdminLayout>
  );
};

export default ManageClubs;
