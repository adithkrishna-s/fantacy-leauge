// frontend/src/components/AdminAddMembers.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../layouts/AdminLayout';

const AdminAddMembers = () => {
  const { clubId } = useParams();
  const [userType, setUserType] = useState('Existing User');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countryCodes, setCountryCodes] = useState([]);

  // Fetch country codes from the JSON file
  useEffect(() => {
    const fetchCountryCodes = async () => {
      try {
        const response = await fetch('https://gist.githubusercontent.com/anubhavshrimal/75f6183458db8c453306f93521e93d37/raw/f77e7598a8503f1f70528ae1cbf9f66755698a16/CountryCodes.json');
        const data = await response.json();
        setCountryCodes(data);
      } catch (error) {
        console.error('Error fetching country codes:', error);
      }
    };

    fetchCountryCodes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
        },
      };

      if (userType === 'Existing User') {
        const response = await axios.post(
          `https://fantacyleauge.com/api/users/add-member/${clubId}`,
          { phoneNumber },
          config
        );
        toast.success(response.data.message);
      } else {
        const response = await axios.post(
          `https://fantacyleauge.com/api/users/register-member/${clubId}`,
          { firstName, lastName, email, phoneNumber, password, countryCode },
          config
        );
        toast.success(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add member');
    }
  };

  return (
    <AdminLayout>
      <ToastContainer />
      <h2 className="text-center">Add Members</h2>
      <form onSubmit={handleSubmit} className="w-50 mx-auto">
        <div className="mb-3">
          <label className="form-label">User Type</label>
          <select
            className="form-control"
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
            required
          >
            <option value="Existing User">Existing User</option>
            <option value="New User">New User</option>
          </select>
        </div>

        {userType === 'Existing User' ? (
          <div className="mb-3">
            <label className="form-label">Phone No. (Without Country Code)</label>
            <input
              type="text"
              className="form-control"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-control"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-control"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Country Code</label>
              <select
                className="form-control"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                required
              >
                <option value="">Select Country Code</option>
                {countryCodes.map((country, index) => (
                  <option key={index} value={country.dial_code}>
                    {`${country.dial_code} (${country.name})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </>
        )}

        <button type="submit" className="btn btn-primary w-100">Add Member</button>
      </form>
    </AdminLayout>
  );
};

export default AdminAddMembers;