import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cleanedPhoneNumber = phoneNumber.replace(/\s/g, ''); // Remove spaces from phone number
      const { data } = await axios.post('https://fantasyleague7.com/api/users/login', 
        { phoneNumber: cleanedPhoneNumber, password }, 
        { withCredentials: true }
      );

      const userInfo = {
        _id: data._id,
        firstName: data.firstName,
        email: data.email,
        userType: data.userType || 'Member',
        credits: data.credits,
        token: data.token,
      };
      
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      toast.success('Login Successful!');
      
      // Redirect based on userType
      if (userInfo.userType === 'Admin') {
        navigate('/admin-dashboard');
      } else if (userInfo.userType === 'Manager') {
        navigate('/manager-dashboard');
      } else {
        navigate('/dashboard');
      }

    } catch (error) {
      console.error('Login error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Invalid phone number or password');
    }
  };

  return (
    <div className="container my-5">
      <ToastContainer />
      <h2 className="text-center mb-4">Login</h2>
      <form onSubmit={handleSubmit} className="w-50 mx-auto">
        <div className="mb-3">
          <label className="form-label">Phone Number (Without Country Code)</label>
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
          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowPassword(!showPassword)}
            >
              <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-100">Login</button>
      </form>
    </div>
  );
};

export default Login;