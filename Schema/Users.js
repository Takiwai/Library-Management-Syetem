const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  password: { type: String, required: true },
  borrowedBooks: [{
    type: mongoose.Schema.Types.ObjectId,  // Reference to Books model
    ref: 'Books'                          // The name of the Book model
  }]
});

// Create the User model
const User = mongoose.model('User', userSchema);

module.exports = User;
