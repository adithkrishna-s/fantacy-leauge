import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ManagerLayout from '../layouts/ManagerLayout';

const AddMatch = () => {
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [status, setStatus] = useState('Active');
  const [isLoading, setIsLoading] = useState(false);
  
//   const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return; // Prevent multiple submissions
    
    setIsLoading(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
        },
      };

      const utcDateTime = new Date(dateTime).toISOString();

      await axios.post(
        '/api/matches',
        { team1, team2, dateTime: utcDateTime, status },
        config
      );

      toast.success('Match added successfully!');
      setTeam1('');
      setTeam2('');
      setDateTime('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add match');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ManagerLayout>
        <div className="container my-5">
        <ToastContainer />
        <h2 className="text-center">Add Match</h2>
        <form onSubmit={handleSubmit} className="w-50 mx-auto">
            <div className="mb-3">
            <label className="form-label">Team 1</label>
            <input
                type="text"
                className="form-control"
                value={team1}
                onChange={(e) => setTeam1(e.target.value)}
                required
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
            />
            </div>

            <div className="mb-3">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                disabled={isLoading}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-100"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Adding...
                </>
              ) : 'Add Match'}
            </button>
        </form>
        </div>
    </ManagerLayout>
  );
};

export default AddMatch;