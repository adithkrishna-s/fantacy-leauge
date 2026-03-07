import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MemberLayout from '../layouts/MemberLayout';

const PlaceBet = () => {
  const [userData, setUserData] = useState(null);
  const [matches, setMatches] = useState([]);
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [combination, setCombination] = useState('');
  const [combinationsMaster, setCombinationsMaster] = useState([]);
  const [selectedCombinations, setSelectedCombinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [nonChosenCollapsed, setNonChosenCollapsed] = useState(false);
  const [chosenCollapsed, setChosenCollapsed] = useState(false);
  const [selectedComboList, setSelectedComboList] = useState([]);

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

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      };

      const { data: user } = await axios.get(
        'https://fantasyleague7.com/api/users/profile',
        config
      );
      setUserData(user);

      if (user.memberOf && user.memberOf._id) {
        const { data: matchData } = await axios.get(
          `https://fantasyleague7.com/api/matches/club/${user.memberOf._id}`,
          config
        );
        setMatches(matchData);
      }

      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
      setLoading(false);
    }
  };

  const fetchGroupData = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
        },
      };

      const { data: groupData } = await axios.get(`https://fantasyleague7.com/api/groups/${groupId}`, config);
      const { data: matchData } = await axios.get(
        `https://fantasyleague7.com/api/matches/${groupData.match._id}`,
        config
      );

      const updatedGroup = { ...groupData, match: matchData };

      if (!group) {
        setGroup(updatedGroup);
      }

      setCombinationsMaster(updatedGroup.CombinationsMaster || []);
      setSelectedCombinations(updatedGroup.SelectedCombinations || []);

      if (loading) {
        setLoading(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load group');
      setError(error.response?.data?.message || 'Failed to load group');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchGroupData();
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, [groupId]);

  const handleInputChange = (e) => {
    let input = e.target.value.toUpperCase();
    input = input.replace(/[^1-7A-G,]/g, '');
    setCombination(input);
  };

  const handleCombinationClick = (comb) => {
    let updatedList;
    if (selectedComboList.includes(comb)) {
      updatedList = selectedComboList.filter(item => item !== comb);
    } else {
      if (selectedComboList.length >= 5) {
        toast.error('You can select maximum 5 combinations at a time');
        return;
      }
      updatedList = [...selectedComboList, comb];
    }
    setSelectedComboList(updatedList);
    setCombination(updatedList.join(','));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!combination) {
      toast.error('Please select at least one combination');
      return;
    }

    const combinations = combination.split(',').filter(c => c.trim() !== '');
    
    if (combinations.length === 0) {
      toast.error('Please select at least one valid combination');
      return;
    }

    if (combinations.length > 5) {
      toast.error('Maximum 5 combinations allowed per bet');
      return;
    }

    for (const comb of combinations) {
      if (comb.length !== 3) {
        toast.error(`Combination ${comb} must be exactly 3 unique characters`);
        return;
      }
    }
  
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
        },
      };
  
      const { data: bets } = await axios.get(`https://fantasyleague7.com/api/bets/group/${groupId}`, config);
      const totalAmount = group.betAmount * combinations.length;

      // Check user balance
      const { data: user } = await axios.get(
        'https://fantasyleague7.com/api/users/profile',
        config
      );
      
      if (user.credits < totalAmount) {
        toast.error(`Insufficient credits. You need RS${totalAmount} but only have RS${user.credits}`);
        return;
      }

      // Validate each combination
      for (const comb of combinations) {
        const newCombination = comb.split('').sort().join('');
        
        if (group.betType === 'First Better') {
          const isCombinationTaken = bets.some(bet => bet.combination.split('').sort().join('') === newCombination);
          if (isCombinationTaken) {
            toast.error(`Combination ${comb} already taken. Please try another combination.`);
            return;
          }
        } else if (group.betType === 'Multi Betters') {
          const hasUserPlacedSameBet = bets.some(
            bet => bet.better._id === userInfo._id && bet.combination.split('').sort().join('') === newCombination
          );
          if (hasUserPlacedSameBet) {
            toast.error(`You have already placed a bet on combination ${comb}`);
            return;
          }
        }
      }
  
      // Place all bets
      await axios.post(
        'https://fantasyleague7.com/api/bets/multiple',
        {
          betAmount: group.betAmount,
          matchId: group.match._id,
          groupId: group._id,
          combinations,
        },
        config
      );
  
      toast.success(`${combinations.length} bets placed successfully`);
      setTimeout(() => {
        navigate(`/play-match/${group.match._id}`);
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place bets');
    }
  };

  if (loading) {
    return (
      <MemberLayout clubName={userData?.memberOf?.clubName}>
        <div>Loading...</div>
      </MemberLayout>
    );
  }

  if (error) {
    return (
      <MemberLayout clubName={userData?.memberOf?.clubName}>
        <div className="container mt-4">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </MemberLayout>
    );
  }

  if (!group) {
    return (
      <MemberLayout clubName={userData?.memberOf?.clubName}>
        <div className="container mt-4">
        <button className="btn btn-secondary me-3" onClick={() => navigate(-1)}>← Back</button>
          <h2>Group Not Found</h2>
          <p>The group you are trying to access does not exist.</p>
        </div>
      </MemberLayout>
    );
  }

  const getPlayerName = (teamPlayers, index) => {
    if (!teamPlayers) return '-';
    return teamPlayers[index] || '-';
  };

  return (
    <MemberLayout clubName={userData?.memberOf?.clubName}>
      <ToastContainer />
      <div className="container mt-4">
        <div className="d-flex align-items-center mb-3">
          <button className="btn" onClick={() => navigate(-1)}>←</button>
          <h2 className="mb-0 t-Center W-100">Place Bet</h2>
        </div>
        <div className="card">
          <div className="card-body GroupPlaceBetCard">
            <h5 className="card-title">Group Details</h5>
            <p className="card-text"><span className="t-Bold">Bet Type:</span> {group.betType}</p>
            <p className="card-text"><span className="t-Bold">Bet Amount:</span> RS{group.betAmount}</p>
            <p className="card-text"><span className="t-Bold">Prizes:</span> {getPrizeText(group)}</p>
            <p className="card-text"><span className="t-Bold">Match:</span> {group.match.team1} vs {group.match.team2}</p>
            <p className="card-text"><span className="t-Bold">Team 123:</span> {group.match.team1}</p>
            <p className="card-text"><span className="t-Bold">Team ABC:</span> {group.match.team2}</p>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="combination" className="form-label">
                  Combinations (1-7 or A-G, 3 unique characters, max 5 comma separated)
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="combination"
                  value={combination}
                  onChange={handleInputChange}
                  placeholder="Type or select combinations (max 5)"
                  required
                />
                {selectedComboList.length > 0 && (
                  <div className="mt-2">
                    <small>Selected: {selectedComboList.join(', ')}</small>
                    <br />
                    <small>Total Amount: RS{group.betAmount * selectedComboList.length}</small>
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-primary">
                Place {selectedComboList.length > 0 ? `${selectedComboList.length} Bets` : 'Bet'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-3 card">
          <div className="card-header">
            <h5 className="mb-0">Players</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6" id="DashboardPlSec">
                <h5>{group.match.team1}</h5>
                <ul>
                  {Array.from({ length: 7 }).map((_, index) => (
                    <li key={index}>
                      Player {index + 1}: {getPlayerName(group.match.Team1Players, index)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-md-6" id="DashboardPlSec">
                <h5>{group.match.team2}</h5>
                <ul>
                  {Array.from({ length: 7 }).map((_, index) => (
                    <li key={index}>
                      Player {String.fromCharCode(65 + index)}: {getPlayerName(group.match.Team2Players, index)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

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
                    className={`btn btn-sm m-1 ${selectedComboList.includes(comb) ? 'btn-primary' : 'gradient-button'}`}
                    onClick={() => handleCombinationClick(comb)}
                  >
                    {comb}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
    </MemberLayout>
  );
};

export default PlaceBet;