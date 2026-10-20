const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// POST /register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).render('register', { error: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).render('register', { error: 'Email is already registered.' });
    }

    // Hash with 12 salt rounds
    const passwordHash = await bcrypt.hash(password, 12);

    // Save with role strictly forced to 'user' (never trust role from body)
    await User.create({
      name,
      email,
      passwordHash,
      role: 'user',
    });

    res.redirect('/login');
  } catch (err) {
    next(err);
  }
};

// POST /login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch user and explicitly select hidden passwordHash
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+passwordHash');

    // Uniform message to prevent user enumeration
    const invalidMsg = 'Invalid email or password.';

    if (!user) {
      return res.status(401).render('login', { error: invalidMsg });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).render('login', { error: invalidMsg });
    }

    // Issue HTTP-only, secure, strict cookie
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('token', token, {
      httpOnly: true,                                // Prevents XSS script access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: 'strict',                            // CSRF defense
      maxAge: 2 * 60 * 60 * 1000,                    // 2 hours
    });

    res.redirect('/');
  } catch (err) {
    next(err);
  }
};

// GET /logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
};