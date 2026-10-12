const mongoose = require('mongoose');
mongoose.connect(`${process.env.MONGODB_URI}/Wired`)

const userSchema = mongoose.Schema({
    email: String,
    password: String
});

module.exports = mongoose.model('user', userSchema);