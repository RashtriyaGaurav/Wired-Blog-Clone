const { body, validationResult } = require('express-validator');
const slugify = require('slugify');
const Post = require('../models/postModel');

// Validation Rules array
exports.validatePost = [
  body('title').trim().isLength({ min: 3, max: 150 }).withMessage('Title must be between 3 and 150 characters.'),
  body('excerpt').trim().isLength({ min: 5, max: 300 }).withMessage('Excerpt must be between 5 and 300 characters.'),
  body('category').isIn(['Health', 'Science', 'Technology', 'Food']).withMessage('Invalid category selected.'),
  body('coverImage')
    .trim()
    .isURL({ protocols: ['https'] })
    .withMessage('Must be a valid HTTPS image URL'),
  body('contentMarkdown').trim().notEmpty().withMessage('Content body cannot be empty.'),
];

// GET /admin/create
exports.getCreatePage = (req, res) => {
  res.render('admin/create', { errors: [], formData: {} });
};

// POST /admin/create
exports.createPost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('admin/create', {
        errors: errors.array(),
        formData: req.body,
      });
    }

    const { title, excerpt, category, coverImage, coverAlt, contentMarkdown, isTrending, isTopStory } = req.body;

    // Generate unique slug
    let baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;

    while (await Post.exists({ slug })) {
      slug = `${baseSlug}-${Math.floor(Math.random() * 1000)}`;
    }

    // Create post document
    await Post.create({
      title,
      slug,
      excerpt,
      coverImage: {
        url: coverImage,
        alt: coverAlt || '',
      },
      contentMarkdown,
      category,
      isTrending: Boolean(isTrending),
      isTopStory: Boolean(isTopStory),
      author: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
    });

    res.redirect('/');
  } catch (err) {
    next(err);
  }
};