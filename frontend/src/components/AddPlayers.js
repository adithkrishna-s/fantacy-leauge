import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ManagerLayout from '../layouts/ManagerLayout';

const AddPlayers = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [team1Players, setTeam1Players] = useState(Array(7).fill('-'));
  const [team2Players, setTeam2Players] = useState(Array(7).fill('-'));
  const [match, setMatch] = useState(null);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        const { data } = await axios.get(`/api/matches/${matchId}`, config);
        setMatch(data);

        // Populate player names if they already exist
        if (data.Team1Players) {
          const team1PlayersArray = Array(7).fill('-');
          Object.keys(data.Team1Players).forEach((key) => {
            team1PlayersArray[parseInt(key)] = data.Team1Players[key];
          });
          setTeam1Players(team1PlayersArray);
        }

        if (data.Team2Players) {
          const team2PlayersArray = Array(7).fill('-');
          Object.keys(data.Team2Players).forEach((key) => {
            team2PlayersArray[parseInt(key)] = data.Team2Players[key];
          });
          setTeam2Players(team2PlayersArray);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch match details');
      }
    };

    fetchMatchDetails();
  }, [matchId]);

  const handlePlayerChange = (team, index, value) => {
    if (team === 1) {
      const updatedPlayers = [...team1Players];
      updatedPlayers[index] = value;
      setTeam1Players(updatedPlayers);
    } else {
      const updatedPlayers = [...team2Players];
      updatedPlayers[index] = value;
      setTeam2Players(updatedPlayers);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      // Convert arrays to JSON objects
      const team1PlayersObj = {};
      team1Players.forEach((player, index) => {
        if (player !== '-') {
          team1PlayersObj[index] = player;
        }
      });

      const team2PlayersObj = {};
      team2Players.forEach((player, index) => {
        if (player !== '-') {
          team2PlayersObj[index] = player;
        }
      });

      // Update players in the match
      await axios.put(
        `/api/matches/${matchId}/update-players`,
        { team1Players: team1PlayersObj, team2Players: team2PlayersObj },
        config
      );

      toast.success('Players updated successfully!');
      navigate('/manager-dashboard/Manage-Matches');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update players');
    }
  };

  if (!match) {
    return (
      <ManagerLayout>
        <div className="container my-5">
          <p>Loading...</p>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <ToastContainer />
      <div className="container my-5">
        <h2 className="text-center">Add/Edit Players</h2>
        <form onSubmit={handleSubmit} className="my-4">
          <div className="row">
            <div className="col-md-6" id="resultelement">
              <h4>{match.team1} Players</h4>
              {team1Players.map((player, index) => (
                <div className="mb-3" key={index}>
                  <label className="form-label">Player {index + 1}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={player}
                    onChange={(e) => handlePlayerChange(1, index, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="col-md-6" id="resultelement">
              <h4>{match.team2} Players</h4>
              {team2Players.map((player, index) => (
                <div className="mb-3" key={index}>
                  <label className="form-label">Player {String.fromCharCode(65 + index)}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={player}
                    onChange={(e) => handlePlayerChange(2, index, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-100">Save Players</button>
        </form>
      </div>
    </ManagerLayout>
  );
};

export default AddPlayers;