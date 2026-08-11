// src/components/MyBets.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MemberLayout from '../layouts/MemberLayout';
import Pagination from 'react-bootstrap/Pagination';

const MyBets = () => {
  const [userData, setUserData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState([]);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [betsPerPage] = useState(20);

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
        '/api/users/profile',
        config
      );
      setUserData(user);

      if (user.memberOf && user.memberOf._id) {
        const { data: matchData } = await axios.get(
          `/api/matches/club/${user.memberOf._id}`,
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

  useEffect(() => {
    fetchBets();
    fetchWinners();
  }, []);

  const fetchBets = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
        },
      };

      const { data } = await axios.get('/api/bets/my-bets', config);
      setBets(data);
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load bets');
      setLoading(false);
    }
  };

  const fetchWinners = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
        },
      };

      const { data } = await axios.get('/api/winners/my-winnings', config);
      setWinners(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load winnings');
    }
  };

  // Get current bets
  const indexOfLastBet = currentPage * betsPerPage;
  const indexOfFirstBet = indexOfLastBet - betsPerPage;
  const currentBets = bets.slice(indexOfFirstBet, indexOfLastBet);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Function to get winning amount for a bet
  const getWinningAmount = (betId) => {
    for (const winner of winners) {
      const firstWinner = winner.firstWinners.find((w) => w.bet.toString() === betId.toString());
      if (firstWinner) return firstWinner.amountWon;

      const secondWinner = winner.secondWinners.find((w) => w.bet.toString() === betId.toString());
      if (secondWinner) return secondWinner.amountWon;

      const thirdWinner = winner.thirdWinners.find((w) => w.bet.toString() === betId.toString());
      if (thirdWinner) return thirdWinner.amountWon;
    }
    return null;
  };

  if (loading) {
    return (
      <MemberLayout clubName={userData?.memberOf?.clubName}>
        <div>Loading...</div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout clubName={userData?.memberOf?.clubName}>
      <ToastContainer />
      <div className="dashboard-content">
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">My Bets</h5>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Match</th>
                    <th>Group Type</th>
                    <th>Bet Amount</th>
                    <th>Combination</th>
                    <th>Result</th>
                    <th>Score</th>
                    <th>Winning Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBets.map((bet) => {
                    const winningAmount = getWinningAmount(bet._id);
                    return (
                      <tr key={bet._id}>
                        <td>{new Date(bet.createdAt).toLocaleString()}</td>
                        <td>{bet.match.team1} vs {bet.match.team2}</td>
                        <td>{bet.group.betType}</td>
                        <td>RS{bet.betAmount}</td>
                        <td>{bet.combination}</td>
                        <td style={{ color: bet.result === 'Win' ? 'green' : 'red' }}>{bet.result}</td>
                        <td>{bet.score}</td>
                        <td>{winningAmount ? `RS${winningAmount}` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination>
              {[...Array(Math.ceil(bets.length / betsPerPage)).keys()].map((number) => (
                <Pagination.Item key={number + 1} active={number + 1 === currentPage} onClick={() => paginate(number + 1)}>
                  {number + 1}
                </Pagination.Item>
              ))}
            </Pagination>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
};

export default MyBets;