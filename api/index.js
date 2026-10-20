require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const { attachUser, requireUser, requireAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');
const postController = require('../controllers/postController');
const adminController = require('../controllers/adminController');
const Post = require('../models/postModel');

const app = express();

app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ['https://fonts.gstatic.com'],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      },
    },
  })
);

app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again after 15 minutes.',
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many accounts created from this IP. Please try again later.',
});

let cached = global._mongoose || (global._mongoose = { conn: null, promise: null });
async function connectDB() {
  if (cached.conn) return cached.conn;

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGO_URI is missing!');

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 }).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use(attachUser);

const CATEGORIES = ['Health', 'Science', 'Technology', 'Food'];

// Display offsets: DB stores REAL numbers, these are added only when showing
const VIEWS_OFFSET = 4659;
const LIKES_OFFSET = 897;

function withOffsets(p) {
  if (!p) return p;
  p.views = (p.views || 0) + VIEWS_OFFSET;
  p.likeCount = (p.likeCount || 0) + LIKES_OFFSET;
  return p;
}

// --- Auth Routes ---
app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', registerLimiter, authController.register);

app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', loginLimiter, authController.login);
app.post('/logout', authController.logout);

// --- Admin Routes ---
app.get('/admin/create', requireAdmin, postController.getCreatePage);
app.post('/admin/create', requireAdmin, postController.validatePost, postController.createPost);
app.get('/admin/posts', requireAdmin, adminController.listPosts);
app.get('/admin/edit/:id', requireAdmin, adminController.getEditPage);
app.post('/admin/edit/:id', requireAdmin, adminController.validateEdit, adminController.updatePost);
app.post('/admin/delete/:id', requireAdmin, adminController.deletePost);

// --- Homepage Route ---
app.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const LIMIT = 8; // 5 se 10 ke beech rakho, 10 se zyada nahi

    const rawCategory = String(req.query.category || '');
    const selectedCategory = CATEGORIES.includes(rawCategory) ? rawCategory : null;

    const base = { published: true, ...(selectedCategory && { category: selectedCategory }) };
    const cardFields = 'title slug excerpt coverImage category author.name likeCount views createdAt';

    let hero = null;
    let topStories = [];

    if (!selectedCategory) {
      [hero, topStories] = await Promise.all([
        Post.findOne({ ...base, isTrending: true }).sort({ createdAt: -1 }).select(cardFields).lean(),
        Post.find({ ...base, isTopStory: true }).sort({ createdAt: -1 }).limit(3).select(cardFields).lean(),
      ]);
    }

    const excludeIds = [hero?._id, ...topStories.map((p) => p._id)].filter(Boolean);

    const [recent, total] = await Promise.all([
      Post.find({ ...base, _id: { $nin: excludeIds } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * LIMIT)
        .limit(LIMIT)
        .select(cardFields)
        .lean(),
      Post.countDocuments({ ...base, _id: { $nin: excludeIds } }),
    ]);

    withOffsets(hero);
    topStories.forEach(withOffsets);
    recent.forEach(withOffsets);

    // "Load more" request: sirf cards ka HTML bhejo
    if (req.query.partial === '1') {
      return res.render('partials/cards', { recent });
    }

    res.render('index', {
      hero,
      topStories,
      recent,
      page,
      totalPages: Math.ceil(total / LIMIT) || 1,
      selectedCategory,
    });
  } catch (err) {
    next(err);
  }
});

// --- Like / Unlike (POST only, logged-in users only) ---
app.post('/post/:slug/like', requireUser, async (req, res, next) => {
  try {
    const uid = req.user._id;
    const slug = String(req.params.slug);

    let post = await Post.findOneAndUpdate(
      { slug, published: true, likes: { $ne: uid } },
      { $addToSet: { likes: uid }, $inc: { likeCount: 1 } },
      { new: true }
    )
      .select('likeCount')
      .lean();

    let liked = true;

    if (!post) {
      post = await Post.findOneAndUpdate(
        { slug, published: true, likes: uid },
        { $pull: { likes: uid }, $inc: { likeCount: -1 } },
        { new: true }
      )
        .select('likeCount')
        .lean();
      liked = false;
    }

    if (!post) return res.status(404).json({ error: 'Post Not Found' });

    // Send the DISPLAY count (real + offset) so the button matches the page
    res.json({ success: true, liked, likeCount: (post.likeCount || 0) + LIKES_OFFSET });
  } catch (err) {
    next(err);
  }
});

// --- Single Post ---
app.get('/post/:slug', async (req, res, next) => {
  try {
    const post = await Post.findOneAndUpdate(
      { slug: String(req.params.slug), published: true },
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!post) {
      return res.status(404).render('404', { title: 'Post Not Found' });
    }

    const liked =
      req.user && Array.isArray(post.likes)
        ? post.likes.some((id) => id.toString() === req.user._id.toString())
        : false;

    const suggestionFields = 'title slug excerpt coverImage category author.name views likeCount createdAt';

    let suggestions = await Post.find({
      published: true,
      _id: { $ne: post._id },
      category: post.category,
    })
      .sort({ views: -1, createdAt: -1 })
      .limit(2)
      .select(suggestionFields)
      .lean();

    if (suggestions.length < 2) {
      const fallback = await Post.find({
        published: true,
        _id: { $nin: [post._id, ...suggestions.map((p) => p._id)] },
      })
        .sort({ views: -1, createdAt: -1 })
        .limit(2 - suggestions.length)
        .select(suggestionFields)
        .lean();
      suggestions = [...suggestions, ...fallback];
    }

    withOffsets(post);
    suggestions.forEach(withOffsets);

    res.render('post', { post, liked, suggestions });
  } catch (err) {
    next(err);
  }
});
app.get('/about', (req, res) => res.render('about'));
app.get('/privacy', (req, res) => res.render('privacy'));

// Error handling
app.use((req, res) => res.status(404).render('404', { title: 'Page Not Found' }));
app.use((err, req, res, next) => {
  console.error(err);
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).render('error', {
    message: err.message || 'Internal Server Error',
    error: isProduction ? {} : err,
  });
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}