import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../layouts/AdminLayout';

const AdminViewBets = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBets = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        // Fetch group details
        const { data: groupData } = await axios.get(`/api/groups/${groupId}`, config);
        setGroup(groupData);

        const { data } = await axios.get(`/api/bets/group/${groupId}`, config);
        setBets(data);
        setLoading(false);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch bets');
        setLoading(false);
      }
    };

    fetchBets();
  }, [groupId]);

  return (
    <AdminLayout>
      <ToastContainer />
      <div className="container my-5">
        <div className="d-flex align-items-center mb-3">
          <button className="btn" onClick={() => navigate(-1)}>←</button>
          <h2 className="mb-0 t-Center W-100">Bets for Group</h2>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          
          <>
            <div className="TotalBettings">
              <p><span >Total Pool Collected:</span> <span className='TotalMoney'>RS{group.totalBetAmount}</span></p>
            </div>
            <div className="Resultcards">
              {bets.map((bet) => (
                <div className="card my-3 mx-2 py-3 Resultcard" key={bet._id}>
                  <div className="ResultCardRow">
                    <div className="ResultCardCol">
                      <div className="ResultCardStat">
                        <p>{bet.better.firstName} {bet.better.lastName}</p>
                      </div>
                      <div className="ResultCardDesc">
                        <p>Better</p>
                      </div>
                    </div>
                  </div>

                  <div className="ResultCardRow">
                    <div className="ResultCardCol">
                      <div className="ResultCardStat">
                        <p>{bet.better.phoneNumber}</p>
                      </div>
                      <div className="ResultCardDesc">
                        <p>Phone</p>
                      </div>
                    </div>
                  </div>

                  <div className="ResultCardRow">
                    <div className="ResultCardCol">
                      <div className="ResultCardStat">
                        <p>RS{bet.betAmount}</p>
                      </div>
                      <div className="ResultCardDesc">
                        <p>Bet Amount</p>
                      </div>
                    </div>
                    <div className="ResultCardCol">
                      <div className="ResultCardStat">
                        <p>{bet.combination}</p>
                      </div>
                      <div className="ResultCardDesc">
                        <p>Combination</p>
                      </div>
                    </div>
                  </div>

                  <div className="ResultCardRow">
                    <div className="ResultCardCol">
                      <div className="ResultCardStat">
                        <p>{bet.score}</p>
                      </div>
                      <div className="ResultCardDesc">
                        <p>Score</p>
                      </div>
                    </div>
                    <div className="ResultCardCol">
                      <div className="ResultCardStat">
                        <p
                          style={{
                            color:
                              bet.result === "Win"
                                ? "green"
                                : bet.status === "Loss"
                                ? "red"
                                : "black",
                          }}
                        >
                        {bet.result || 'TBA'}
                        </p>

                      </div>
                      <div className="ResultCardDesc">
                        <p>Result</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            </div>

          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminViewBets;