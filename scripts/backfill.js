require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/postModel');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const v = await Post.updateMany(
    { $or: [{ views: { $exists: false } }, { views: { $lt: 4687 } }] },
    [{ $set: { views: { $add: [{ $ifNull: ['$views', 0] }, 4687] } } }]
  );

  const l = await Post.updateMany(
    { $or: [{ likeCount: { $exists: false } }, { likeCount: { $lt: 598 } }] },
    [{ $set: { likeCount: { $add: [{ $ifNull: ['$likeCount', 0] }, 598] } } }]
  );

  console.log('views updated:', v.modifiedCount, '| likes updated:', l.modifiedCount);
  await mongoose.disconnect();
})();