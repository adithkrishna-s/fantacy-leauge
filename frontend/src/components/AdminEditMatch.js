// src/components/EditMatch.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../layouts/AdminLayout';

const AdminEditMatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        const { data } = await axios.get(`https://fantasyleague7.com/api/matches/${id}`, config);
        setTeam1(data.team1);
        setTeam2(data.team2);
        setDateTime(new Date(data.dateTime).toISOString().slice(0, 16));
        setStatus(data.status);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch match details');
      }
    };

    fetchMatch();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      const utcDateTime = new Date(dateTime).toISOString();

      await axios.put(
        `https://fantasyleague7.com/api/matches/${id}`,
        { team1, team2, dateTime: utcDateTime, status },
        config
      );

      // Fetch match details again to get the club ID
      const matchResponse = await axios.get(`https://fantasyleague7.com/api/matches/${id}`, config);
      const clubId = matchResponse.data.club._id; // Assuming 'club' contains the club ID

      toast.success('Match updated successfully!');
      navigate(`/admin-dashboard/manage-club/${clubId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update match');
    }
  };

  return (
    <AdminLayout>
      <ToastContainer />
      <div className="container my-5">
        <h2 className="text-center">Edit Match</h2>
        <form onSubmit={handleSubmit} className="w-50 mx-auto">
          <div className="mb-3">
            <label className="form-label">Team 1</label>
            <input
              type="text"
              className="form-control"
              value={team1}
              onChange={(e) => setTeam1(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Team 2</label>
            <input
              type="text"
              className="form-control"
              value={team2}
              onChange={(e) => setTeam2(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Date and Time</label>
            <input
              type="datetime-local"
              className="form-control"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary w-100">Update Match</button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminEditMatch;