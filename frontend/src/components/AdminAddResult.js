import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../layouts/AdminLayout';

const AdminAddResult = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [team1Scores, setTeam1Scores] = useState(Array(7).fill(0));
  const [team2Scores, setTeam2Scores] = useState(Array(7).fill(0));
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [resultId, setResultId] = useState(null);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        const { data } = await axios.get(`https://fantacyleauge.com/api/matches/${matchId}`, config);
        setTeam1Name(data.team1);
        setTeam2Name(data.team2);

        if (data.result) {
          setResultId(data.result);
          
          // Fetch the result details separately
            const resultResponse = await axios.get(`https://fantacyleauge.com/api/results/${data.result}`, config);
            const resultData = resultResponse.data;

            setTeam1Scores(resultData.team1Scores || Array(7).fill(0));
            setTeam2Scores(resultData.team2Scores || Array(7).fill(0));
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch match details');
      }
    };

    fetchMatchDetails();
  }, [matchId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      if (resultId) {
        await axios.put(
          `https://fantacyleauge.com/api/results/${resultId}`,
          { team1Scores, team2Scores },
          config
        );
        toast.success('Result updated successfully!');
      } else {
        await axios.post(
          'https://fantacyleauge.com/api/results',
          { matchId, team1Scores, team2Scores },
          config
        );
        toast.success('Result added successfully!');
      }

      const matchResponse = await axios.get(`https://fantacyleauge.com/api/matches/${matchId}`, config);
      const clubId = matchResponse.data.club._id; // Assuming 'club' contains the club ID

      navigate(`/admin-dashboard/manage-club/${clubId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit result');
    }
  };

  const handleScoreChange = (team, index, value) => {
    const scores = team === 1 ? [...team1Scores] : [...team2Scores];
    scores[index] = Number(value);
    team === 1 ? setTeam1Scores(scores) : setTeam2Scores(scores);
  };

  return (
    <AdminLayout>
      <ToastContainer />
      <div className="container my-5">
        <h2 className="text-center">{resultId ? 'Edit Result' : 'Add Result'}</h2>
        <form onSubmit={handleSubmit} className="my-4">
          <div className="row">
            <div className="col-md-6" id="resultelement">
              <h4>{team1Name} Scores</h4>
              {team1Scores && team1Scores.map((score, index) => (
                <div className="mb-3" key={index}>
                  <label className="form-label">Player {index + 1}</label>
                  <input
                    type="number"
                    className="form-control"
                    value={score}
                    onChange={(e) => handleScoreChange(1, index, e.target.value)}
                    required
                  />
                </div>
              ))}
            </div>

            <div className="col-md-6" id="resultelement">
              <h4>{team2Name} Scores</h4>
              {team2Scores && team2Scores.map((score, index) => (
                <div className="mb-3" key={index}>
                  <label className="form-label">Player {String.fromCharCode(65 + index)}</label>
                  <input
                    type="number"
                    className="form-control"
                    value={score}
                    onChange={(e) => handleScoreChange(2, index, e.target.value)}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-100">{resultId ? 'Update Result' : 'Submit Result'}</button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminAddResult;