const mongoose = require('mongoose');

// 1. Handled potential connection issues (Best Practice)
mongoose.connect(`${process.env.MONGODB_URI}/Wired`)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const postSchema = mongoose.Schema({
  title: String,
  description: String,
  url: String,
  imageUrl: String,
  content: String,
  createdBy: {
    type: String,
    default: "Team Elite"
  },
  createdAt: {
    type: Date,
    // 2. Fixed the immediate execution bug
    default: Date.now 
  }
});

// 3. CAPITALIZED the model name (Convention)
module.exports = mongoose.model('Post', postSchema); 
