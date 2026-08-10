const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const asyncHandler = require('express-async-handler');

// Protect routes (ensure user is authenticated)
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from Prisma database (excluding password)
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        res.status(401);
        throw new Error('User not found');
      }

      const { password, ...userWithoutPassword } = user;
      req.user = {
        ...userWithoutPassword,
        _id: user.id, // For backward compatibility with frontend expecting _id
      };

      next();
    } catch (error) {
      res.status(401);
      throw new Error(error.message || 'Not authorized, token failed');
    }
  } else {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Ensure user is an admin
const admin = (req, res, next) => {
  if (req.user && req.user.userType === 'Admin') {
    next();
  } else {
    res.status(403);
    throw new Error('Access denied. Admins only.');
  }
};

// Ensure user is a manager
const manager = (req, res, next) => {
  if (req.user && req.user.userType === 'Manager') {
    next();
  } else {
    res.status(403);
    throw new Error('Access denied. Managers only.');
  }
};

// Ensure user is a member
const member = (req, res, next) => {
  if (req.user && req.user.userType === 'Member') {
    next();
  } else {
    res.status(403);
    throw new Error('Access denied. Members only.');
  }
};

// Modify the existing 'manager' middleware to allow Members too
const managerOrMember = (req, res, next) => {
  if (req.user && (req.user.userType === 'Manager' || req.user.userType === 'Member')) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as a Manager or Member');
  }
};


const managerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.userType === 'Manager' || req.user.userType === 'Admin')) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as a Manager or Admin');
  }
};

const managerOrAdminOrMember = (req, res, next) => {
  if (req.user && (req.user.userType === 'Manager' || req.user.userType === 'Admin' || req.user.userType === 'Member')) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as a Manager, Admin, or Member');
  }
};


module.exports = { protect, admin, manager, member, managerOrMember, managerOrAdmin, managerOrAdminOrMember }; // Export manager middleware