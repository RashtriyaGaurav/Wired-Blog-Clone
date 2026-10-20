const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Post = require('../models/postModel');

const CATEGORIES = ['Health', 'Science', 'Technology', 'Food'];
const PAGE_SIZE = 10;

const isBadId = (id) => !mongoose.isValidObjectId(id);
const notFound = (res) => res.status(404).render('404', { title: 'Not Found' });

// ---------- Validation (edit form) ----------
exports.validateEdit = [
  body('title').trim().isLength({ min: 3, max: 150 }).withMessage('Title 3 to 150 characters ka hona chahiye'),
  body('excerpt').trim().isLength({ min: 10, max: 300 }).withMessage('Excerpt 10 to 300 characters ka hona chahiye'),
  body('category').isIn(CATEGORIES).withMessage('Invalid category'),
  body('coverImage').trim().isURL({ protocols: ['https'], require_protocol: true }).withMessage('Cover image ek valid https URL honi chahiye'),
  body('coverAlt').trim().isLength({ max: 200 }).withMessage('Alt text 200 characters se chhota rakho'),
  body('contentMarkdown').trim().isLength({ min: 10, max: 50000 }).withMessage('Content kam se kam 10 characters ka hona chahiye'),
];

// ---------- List: GET /admin/posts ----------
exports.listPosts = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const [posts, total] = await Promise.all([
      Post.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .select('title slug category published isTrending isTopStory views likeCount createdAt')
        .lean(),
      Post.countDocuments({}),
    ]);

    const messages = {
      updated: 'Post update ho gaya.',
      deleted: 'Post delete ho gaya.',
      created: 'Post publish ho gaya.',
    };

    res.render('admin/posts', {
      title: 'Manage Posts',
      posts,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE) || 1,
      flash: messages[String(req.query.msg)] || null,
    });
  } catch (err) {
    next(err);
  }
};

// ---------- Edit form: GET /admin/edit/:id ----------
exports.getEditPage = async (req, res, next) => {
  try {
    if (isBadId(req.params.id)) return notFound(res);

    const post = await Post.findById(req.params.id).lean();
    if (!post) return notFound(res);

    res.render('admin/edit', { title: 'Edit Post', post, errors: [], categories: CATEGORIES });
  } catch (err) {
    next(err);
  }
};

// ---------- Save: POST /admin/edit/:id ----------
exports.updatePost = async (req, res, next) => {
  try {
    if (isBadId(req.params.id)) return notFound(res);

    const post = await Post.findById(req.params.id);
    if (!post) return notFound(res);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Form wapas dikhao, user ka typed data rakhke
      const draft = {
        _id: post._id,
        slug: post.slug,
        title: String(req.body.title || ''),
        excerpt: String(req.body.excerpt || ''),
        category: String(req.body.category || ''),
        coverImage: { url: String(req.body.coverImage || ''), alt: String(req.body.coverAlt || '') },
        contentMarkdown: String(req.body.contentMarkdown || ''),
        isTrending: req.body.isTrending === 'on',
        isTopStory: req.body.isTopStory === 'on',
        published: req.body.published === 'on',
      };
      return res.status(400).render('admin/edit', {
        title: 'Edit Post',
        post: draft,
        errors: errors.array().map((e) => e.msg),
        categories: CATEGORIES,
      });
    }

    // Fields ek ek karke assign (req.body kabhi seedha mat do)
    post.title = String(req.body.title).trim();
    post.excerpt = String(req.body.excerpt).trim();
    post.category = String(req.body.category);
    post.coverImage = { url: String(req.body.coverImage).trim(), alt: String(req.body.coverAlt || '').trim() };
    post.contentMarkdown = String(req.body.contentMarkdown).trim();
    post.isTrending = req.body.isTrending === 'on';
    post.isTopStory = req.body.isTopStory === 'on';
    post.published = req.body.published === 'on';
    // slug, author, likes, views ko touch nahi kar rahe

    await post.save(); // pre('save') hook contentHtml dobara sanitize karke bana deta hai

    res.redirect('/admin/posts?msg=updated');
  } catch (err) {
    next(err);
  }
};

// ---------- Delete: POST /admin/delete/:id ----------
exports.deletePost = async (req, res, next) => {
  try {
    if (isBadId(req.params.id)) return notFound(res);

    const deleted = await Post.findByIdAndDelete(req.params.id);
    if (!deleted) return notFound(res);

    res.redirect('/admin/posts?msg=deleted');
  } catch (err) {
    next(err);
  }
};