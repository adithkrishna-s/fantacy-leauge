import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from "../layouts/AdminLayout";


const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in and is admin
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || userInfo.userType !== 'Admin') {
      navigate('/login');
      return;
    }

    // Fetch users with credits
    const fetchUsers = async () => {
      try {
        const config = {
          headers: {
            'Authorization': `Bearer ${userInfo.token}`,
          },
        };
        const { data } = await axios.get('https://fantacyleauge.com/api/users/', config);
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('userInfo');
          navigate('/login');
        }
      }
    };

    fetchUsers();
  }, [navigate]);


  return (
    <AdminLayout>
      <img id="Leftbanner1" src="/assets/AdminBanner.png" alt="MemberBanner" />
      <div class="d-flex justify-content-center align-items-center MainDataTitle my-4" bis_skin_checked="1"><h1>Users List</h1></div>

      
        <div className='Resultcards'>
        {users.map((user) => (
          <div className="card my-3 mx-2 py-3 Resultcard" key={user._id}>
            <div className="ResultCardRow">
              <div className="ResultCardCol">
                <div className="ResultCardStat">
                  <p>{`${user.firstName} ${user.lastName}`}</p>
                </div>
                <div className="ResultCardDesc">
                  <p>Name</p>
                </div>
              </div>
            </div>

            <div className="ResultCardRow">
              <div className="ResultCardCol">
                <div className="ResultCardStat">
                  <p>{user.phoneNumber}</p>
                </div>
                <div className="ResultCardDesc">
                  <p>Phone</p>
                </div>
              </div>
            </div>

            <div className="ResultCardRow">
              <div className="ResultCardCol">
                <div className="ResultCardStat">
                  <p>{user.userType}</p>
                </div>
                <div className="ResultCardDesc">
                  <p>User Type</p>
                </div>
              </div>
            </div>

            <div className="ResultCardRow">
              <div className="ResultCardCol">
                <div className="ResultCardStat">
                  <p>{user.credits}</p>
                </div>
                <div className="ResultCardDesc">
                  <p>Credit Balance</p>
                </div>
              </div>
            </div>


          </div>
        ))}
      </div>


    </AdminLayout>
  );
};

export default AdminDashboard;