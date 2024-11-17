const mongoose = require('mongoose');

// Transaction schema definition
const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,  // Reference to the User model
    ref: 'User',  // The name of the User model
    required: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,  // Reference to the Books model
    ref: 'Books',  // The name of the Books model
    required: true
  },
  transactionType: {
    type: String,
    enum: ['borrow', 'return'],  // Transaction type: either borrow or return
    required: true
  },
  transactionDate: {
    type: Date,
    default: Date.now,  // The date of transaction
    required: true
  },
  dueDate: {
    type: Date,  // Due date for the book to be returned
    required: true
  },
  returnDate: {
    type: Date,  // The actual return date
    required: false
  },
  status: {
    type: String,
    enum: ['active', 'completed'],  // active: still borrowed, completed: returned
    default: 'active'
  },
  fineAmount: {
    type: Number,
    default: 0  // Optional fine for late returns
  }
});

// Create Transaction model
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
