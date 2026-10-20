const mongoose = require('mongoose');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const postSchema = new mongoose.Schema({
  views: { type: Number, default: 0 },
  title:   { type: String, required: true, trim: true, maxlength: 150 },
  slug:    { type: String, required: true, unique: true, index: true },
  excerpt: { type: String, required: true, maxlength: 300 },
  coverImage: {
    url: { type: String, required: true },
    alt: { type: String, default: '' },
  },
  contentMarkdown: { type: String, required: true },
  contentHtml:     { type: String },
  category: { type: String, enum: ['Health', 'Science', 'Technology', 'Food'], required: true },
  isTrending: { type: Boolean, default: false },
  isTopStory: { type: Boolean, default: false },
  published:  { type: Boolean, default: true },
  likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  author: {
    id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:  String,
    email: String,
  },
}, { timestamps: true });

// Compound indexes
postSchema.index({ published: 1, createdAt: -1 });
postSchema.index({ published: 1, isTrending: 1, createdAt: -1 });
postSchema.index({ published: 1, isTopStory: 1, createdAt: -1 });
postSchema.index({ published: 1, category: 1, createdAt: -1 });

postSchema.pre('save', function () {
  if (this.isModified('contentMarkdown') && this.contentMarkdown) {
    const rawHtml = marked.parse(this.contentMarkdown);
    this.contentHtml = sanitizeHtml(rawHtml, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'title'],
      },
      allowedSchemes: ['https'],
    });
  }
});

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);