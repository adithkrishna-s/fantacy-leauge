// src/components/ViewBets.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate} from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ManagerLayout from '../layouts/ManagerLayout';

const ViewBettingSheet = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [combination, setCombination] = useState('');
  const [combinationsMaster, setCombinationsMaster] = useState([]);
  const [selectedCombinations, setSelectedCombinations] = useState([]);
  const [nonChosenCollapsed, setNonChosenCollapsed] = useState(false);
  const [chosenCollapsed, setChosenCollapsed] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    const fetchData = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            'Authorization': `Bearer ${userInfo.token}`,
          },
        };

        // Fetch group details
        const { data: groupData } = await axios.get(`https://fantacyleauge.com/api/groups/${groupId}`, config);
        setGroup(groupData);

        setCombinationsMaster(groupData.CombinationsMaster || []);
        setSelectedCombinations(groupData.SelectedCombinations || []);

        setLoading(false);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load data');
        setError(error.response?.data?.message || 'Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId]);

  const handleCombinationClick = (comb) => {
    setCombination(comb);
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div>Loading...</div>
      </ManagerLayout>
    );
  }

  if (error) {
    return (
      <ManagerLayout>
        <div className="container mt-4">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <ToastContainer />
      <div className="container mt-4">
      <div className="d-flex align-items-center mb-3">
          <button className="btn" onClick={() => navigate(-1)}>←</button>
          <h2 className="mb-0 t-Center W-100">Betting Sheet</h2>
        </div>
        {/* Non-Chosen Combinations - Collapsible */}
        <div className="mt-3 card">
          <div 
            className="card-header d-flex justify-content-between align-items-center"
            onClick={() => setNonChosenCollapsed(!nonChosenCollapsed)}
            style={{ cursor: 'pointer' }}
          >
            <h5 className="mb-0">Non-Chosen Combinations ({combinationsMaster.length})</h5>
            <span className="ms-2">
              {nonChosenCollapsed ? '▼' : '▲'}
            </span>
          </div>
          {!nonChosenCollapsed && (
            <div className="card-body">
              <div className="d-flex flex-wrap">
                {combinationsMaster.map((comb, index) => (
                  <button 
                    key={index} 
                    className="btn btn-sm btn-success m-1"
                    onClick={() => handleCombinationClick(comb)}
                  >
                    {comb}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chosen Combinations - Collapsible */}
        <div className="mt-3 card">
          <div 
            className="card-header d-flex justify-content-between align-items-center"
            onClick={() => setChosenCollapsed(!chosenCollapsed)}
            style={{ cursor: 'pointer' }}
          >
            <h5 className="mb-0">Chosen Combinations ({selectedCombinations.length})</h5>
            <span className="ms-2">
              {chosenCollapsed ? '▼' : '▲'}
            </span>
          </div>
          {!chosenCollapsed && (
            <div className="card-body">
              <div className="d-flex flex-wrap">
                {selectedCombinations.map((comb, index) => (
                  <button 
                    key={index} 
                    className="btn btn-sm btn-danger m-1"
                    onClick={() => handleCombinationClick(comb)}
                  >
                    {comb}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ManagerLayout>
  );
};

export default ViewBettingSheet;