import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import AdminLayout from "../layouts/AdminLayout";
import { toast } from "react-toastify";

const EditClub = () => {
  const { id } = useParams(); // Get club ID from URL
  const navigate = useNavigate();
  const [clubData, setClubData] = useState({
    clubName: "",
    managerEmail: "",
    managerPhone: "",
    managerShare: "",
    adminShare: "",
  });

  useEffect(() => {
    const fetchClub = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userInfo.token}`
            }
        };


        const { data } = await axios.get(`https://fantacyleauge.com/api/clubs/${id}`, config);
        setClubData(data);
      } catch (error) {
        console.error("Error fetching club:", error);
      }
    };
    fetchClub();
  }, [id]);

  const handleChange = (e) => {
    setClubData({ ...clubData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userInfo.token}`
            }
        };
      await axios.put(`https://fantacyleauge.com/api/clubs/${id}`, clubData, config);
      toast.success("Club updated successfully!");
      navigate("/admin-dashboard/manage-club");
    } catch (error) {
      console.error("Error updating club:", error);
      toast.error("Failed to update club.");
    }
  };

  return (
    <AdminLayout>
      <div className="container mt-4">
        <h2>Edit Club</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label>Club Name</label>
            <input
              type="text"
              name="clubName"
              className="form-control"
              value={clubData.clubName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label>Manager Email</label>
            <input
              type="email"
              name="managerEmail"
              className="form-control"
              value={clubData.managerEmail}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label>Manager Phone</label>
            <input
              type="text"
              name="managerPhone"
              className="form-control"
              value={clubData.managerPhone}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label>Manager Share (%)</label>
            <input
              type="number"
              name="managerShare"
              className="form-control"
              value={clubData.managerShare}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label>Admin Share (%)</label>
            <input
              type="number"
              name="adminShare"
              className="form-control"
              value={clubData.adminShare}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-success">Update Club</button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default EditClub;
