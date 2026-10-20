const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.attachUser = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      req.user = null;
      res.locals.user = null;
      return next();
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.id).select('name email role').lean();
  } catch (err) {
    req.user = null;
  }

  res.locals.user = req.user;
  next();
};

exports.requireUser = (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  next();
};

exports.requireAdmin = (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'admin') return res.status(403).send('Forbidden: Admin access required');
  next();
};