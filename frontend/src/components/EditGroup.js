import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ManagerLayout from '../layouts/ManagerLayout';

const EditGroup = () => {
  const { groupId } = useParams();
  const [betType, setBetType] = useState('First Better');
  const [betAmount, setBetAmount] = useState('');
  const [minimumIncrement, setMinimumIncrement] = useState('');
  const [status, setStatus] = useState('Inactive');
  const [matchId, setMatchId] = useState(null);
  const [winnerShare1, setWinnerShare1] = useState('');
  const [winnerShare2, setWinnerShare2] = useState('');
  const [winnerShare3, setWinnerShare3] = useState('');
  const navigate = useNavigate();

  // Validation function for winner share percentages
  const validateWinnerShare = (value, setter, otherShares) => {
    // Convert to number for comparison
    const numValue = Number(value);
    
    // If value is empty, just set it
    if (value === '') {
      setter('');
      return;
    }
    
    // If value is negative, set to 0
    if (numValue < 0) {
      toast.error('Winner share percentage cannot be negative');
      setter('0');
      return;
    }
    
    // Calculate total of all shares
    const totalShares = numValue + otherShares.reduce((sum, share) => sum + (Number(share) || 0), 0);
    
    // If total exceeds 100, show error and adjust
    if (totalShares > 100) {
      toast.error('Total winner shares cannot exceed 100%');
      // Find how much we can allocate (100 - other shares)
      const maxAllowed = 100 - otherShares.reduce((sum, share) => sum + (Number(share) || 0), 0);
      setter(maxAllowed > 0 ? maxAllowed.toString() : '0');
    } else {
      setter(value);
    }
  };

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        const { data } = await axios.get(`https://fantasyleague7.com/api/groups/${groupId}`, config);
        setBetType(data.betType);
        setBetAmount(data.betAmount);
        setMinimumIncrement(data.minimumIncrement || '');
        setStatus(data.status);
        setMatchId(data.match._id);
        setWinnerShare1(data.winnerShare1);
        setWinnerShare2(data.winnerShare2);
        setWinnerShare3(data.winnerShare3);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch group');
      }
    };

    fetchGroup();
  }, [groupId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final validation before submit
    const totalShares = 
      (Number(winnerShare1) || 0) + 
      (Number(winnerShare2) || 0) + 
      (Number(winnerShare3) || 0);
    
    if (totalShares > 100) {
      toast.error('Total winner shares cannot exceed 100%');
      return;
    }

    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      await axios.put(
        `https://fantasyleague7.com/api/groups/${groupId}`,
        {
          betType,
          betAmount,
          minimumIncrement: betType === 'Bidding Method' ? minimumIncrement : undefined,
          winnerShare1,
          winnerShare2,
          winnerShare3,
          status,
        },
        config
      );

      toast.success('Group updated successfully!');
      if (matchId) {
        navigate(`/manager-dashboard/manage-match/${matchId}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update group');
    }
  };

  return (
    <ManagerLayout>
      <ToastContainer />
      <div className="container my-5">
        <h2 className="text-center mb-4">Edit Group</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Bet Type</label>
            <select
              className="form-control"
              value={betType}
              onChange={(e) => setBetType(e.target.value)}
              required
            >
              <option value="First Better">First Better</option>
              {/* <option value="Bidding Method">Bidding Method</option> */}
              <option value="Multi Betters">Multi Betters</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Bet Amount</label>
            <input
              type="number"
              className="form-control"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              required
            />
          </div>
          {betType === 'Bidding Method' && (
            <div className="mb-3">
              <label className="form-label">Minimum Increment</label>
              <input
                type="number"
                className="form-control"
                value={minimumIncrement}
                onChange={(e) => setMinimumIncrement(e.target.value)}
                required
              />
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">1st Winner Share %</label>
            <input
              type="number"
              className="form-control"
              value={winnerShare1}
              onChange={(e) => validateWinnerShare(e.target.value, setWinnerShare1, [winnerShare2, winnerShare3])}
              min="0"
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">2nd Winner Share %</label>
            <input
              type="number"
              className="form-control"
              value={winnerShare2}
              onChange={(e) => validateWinnerShare(e.target.value, setWinnerShare2, [winnerShare1, winnerShare3])}
              min="0"
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">3rd Winner Share %</label>
            <input
              type="number"
              className="form-control"
              value={winnerShare3}
              onChange={(e) => validateWinnerShare(e.target.value, setWinnerShare3, [winnerShare1, winnerShare2])}
              min="0"
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
          <button type="submit" className="btn btn-primary">
            Update Group
          </button>
        </form>
      </div>
    </ManagerLayout>
  );
};

export default EditGroup;