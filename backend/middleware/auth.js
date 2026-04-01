const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    // Also accept token as query param for video streaming (browser <video> tag can't set headers)
    const queryToken = req.query.token;

    if (!authHeader && !queryToken) {
      return res.status(401).json({ message: 'No token provided, authorisation denied' });
    }

    const token = queryToken || authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found, authorisation denied' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

const authorise = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user.role}' is not authorised to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorise };
