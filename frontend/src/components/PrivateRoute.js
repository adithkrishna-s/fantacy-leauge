// src/components/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, allowedUserType }) => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  // Debugging to check stored userInfo and userType
  console.log('Stored userInfo:', userInfo);
  console.log('Allowed userType:', allowedUserType);

  if (!userInfo) {
    return <Navigate to="/login" />;
  }

  if (userInfo.userType?.trim().toLowerCase() !== allowedUserType.trim().toLowerCase()) {
    console.warn(`Access denied: ${userInfo.userType} cannot access ${allowedUserType} routes`);
    return <Navigate to="/" />;
  }

  return children;
};

export default PrivateRoute;
