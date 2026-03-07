import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Register = () => {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm();
  const navigate = useNavigate();
  const [countryCodes, setCountryCodes] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [referrer, setReferrer] = useState(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

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

    // Check for referral code in URL
    if (referralCode) {
      const fetchReferrer = async () => {
        setLoadingReferral(true);
        try {
          const { data } = await axios.get(
            `https://fantasyleague7.com/api/users/referral/${referralCode}`
          );
          setReferrer(data);
          setValue('referralCode', referralCode);
        } catch (error) {
          toast.error('Invalid referral code - proceeding with normal registration');
        } finally {
          setLoadingReferral(false);
        }
      };
      fetchReferrer();
    }
  }, [referralCode, setValue]);

  const onSubmit = async (data) => {
    try {
      data.email = data.email ? data.email.toLowerCase().trim() : null;
      data.phoneNumber = data.phoneNumber.replace(/\s/g, '');
      
      const response = await axios.post(
        'https://fantasyleague7.com/api/users/register', 
        data, 
        { withCredentials: true }
      );
      
      toast.success('Registration Successful');
      
      // Automatically log in the user after registration
      const loginResponse = await axios.post(
        'https://fantasyleague7.com/api/users/login', 
        { phoneNumber: data.phoneNumber, password: data.password }, 
        { withCredentials: true }
      );

      const userInfo = {
        _id: loginResponse.data._id,
        firstName: loginResponse.data.firstName,
        email: loginResponse.data.email,
        userType: loginResponse.data.userType || 'Member',
        token: loginResponse.data.token,
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
      toast.error(error.response?.data?.message || 'Registration Failed');
    }
  };

  return (
    <div className="container my-5">
      <ToastContainer />
      <h2 className="text-center mb-4">Register</h2>
      
      {loadingReferral && (
        <div className="text-center mb-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Verifying referral code...</p>
        </div>
      )}
      
      {referrer && !loadingReferral && (
        <div className="alert alert-info mb-4 text-center">
          <i className="bi bi-gift-fill me-2"></i>
          You're joining with {referrer.firstName}'s referral!
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="w-50 mx-auto">
        <div className="mb-3">
          <label className="form-label">First Name</label>
          <input 
            className="form-control" 
            {...register('firstName', { 
              required: 'First Name is required',
              maxLength: {
                value: 30,
                message: 'First name should be less than 30 characters'
              }
            })} 
          />
          {errors.firstName && <p className="text-danger">{errors.firstName.message}</p>}
        </div>

        <div className="mb-3">
          <label className="form-label">Last Name</label>
          <input 
            className="form-control" 
            {...register('lastName', { 
              required: 'Last Name is required',
              maxLength: {
                value: 30,
                message: 'Last name should be less than 30 characters'
              }
            })} 
          />
          {errors.lastName && <p className="text-danger">{errors.lastName.message}</p>}
        </div>

        <div className="mb-3">
          <label className="form-label">Email (Optional)</label>
          <input 
            type="email" 
            className="form-control" 
            {...register('email', {
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })} 
          />
          {errors.email && <p className="text-danger">{errors.email.message}</p>}
        </div>

        <div className="mb-3">
          <label className="form-label">Country Code</label>
          <select 
            className="form-control" 
            {...register('countryCode', { 
              required: 'Country Code is required' 
            })}
          >
            <option value="">Select Country Code</option>
            {countryCodes.map((country, index) => (
              <option key={index} value={country.dial_code}>
                {`${country.dial_code} (${country.name})`}
              </option>
            ))}
          </select>
          {errors.countryCode && <p className="text-danger">{errors.countryCode.message}</p>}
        </div>

        <div className="mb-3">
          <label className="form-label">WhatsApp Phone Number (Without Country Code)</label>
          <input 
            className="form-control" 
            {...register('phoneNumber', { 
              required: 'Phone Number is required',
              pattern: {
                value: /^[0-9]{9,15}$/,
                message: 'Please enter a valid phone number'
              }
            })} 
          />
          {errors.phoneNumber && <p className="text-danger">{errors.phoneNumber.message}</p>}
        </div>

        <div className="mb-3">
          <label className="form-label">Password</label>
          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
            </button>
          </div>
          {errors.password && <p className="text-danger">{errors.password.message}</p>}
        </div>

        {/* Only show referral code field if not coming from referral link */}
        {!referralCode && (
          <div className="mb-3">
            <label className="form-label">Referral Code (Optional)</label>
            <input 
              className="form-control" 
              {...register('referralCode', {
                pattern: {
                  value: /^[A-Z0-9]{6,10}$/,
                  message: 'Invalid referral code format'
                }
              })}
              placeholder="Enter if you were referred by a friend"
            />
            {errors.referralCode && <p className="text-danger">{errors.referralCode.message}</p>}
          </div>
        )}

        <button 
          type="submit" 
          className="btn btn-primary w-100 py-2"
          disabled={loadingReferral}
        >
          {loadingReferral ? 'Processing...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;