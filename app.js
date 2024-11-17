require('dotenv').config();
const express = require("express");
const mongoose = require("./config/db");
const Users = require("./Schema/Users");
const Books=require('./Schema/Books')
const Transaction=require("./Schema/Transation")
const bcrypt = require("bcrypt");
const path = require('path');
const session = require("express-session");
const MemoryStore = require('memorystore')(session);
const helmet = require('helmet');
const user = require('./Schema/Users');

const app = express();
const port = 5000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, secure: process.env.NODE_ENV === 'production' },
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: true,
    store: new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 })
}));

app.use(express.static(path.join(__dirname, 'template')));


function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.status(401).send("You need to log in.");
}


app.get('/books', async (req, res) => {
    try {
        const books = await Books.find({});
        res.status(200).json(books);
    } catch (error) {
        res.status(500).send('Server error');
    }
});






app.post("/books", async (req, res) => {
    const { title, author, isbn,totalCopies,availableCopies,genre } = req.body;

    if (!title || !author || !isbn || !totalCopies || !availableCopies) {
        return res.status(400).send("All fields are required.");
    }

    try {
       
        const newBook = new Books({ title, author, isbn, publishedDate: new Date(),totalCopies, availableCopies,genre });
        await newBook.save();
        res.status(201).send("Book Added to library");
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).send("Book already exists");
        }
        console.error(err);
        res.status(500).send("Error processing request");
    }
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname,"template/register.html"));
});

app.post("/register", async (req, res) => {
    const { username, email, phone, password } = req.body;

    if (!username || !email || !phone || !password) {
        return res.status(400).send("All fields are required.");
    }

    try {
        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = new Users({ username, email, phone, createdAt: new Date(), password: hashPassword });
        await newUser.save();
        res.status(201).send("User registered successfully");
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).send("User already exists");
        }
        console.error(err);
        res.status(500).send("Error processing request");
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await Users.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).send("Invalid username or password");
        }
        // Store user ID in session
        req.session.userId = user._id;      
       res.redirect('/dashboard');
        // Redirect to the dashboard after login
    } catch (error) {
        res.status(500).send("Error logging in");
    }
});


app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Error logging out");
        }
        res.redirect("/"); // Redirect to login page
    });
});

// Protected route example
app.get("/dashboard", isAuthenticated, async (req, res) => {
    const user = await Users.findById(req.session.userId);
    if(user.email=="admin@gmail.com"){
        res.sendFile(path.join(__dirname,"template/admin/dashboard.html"))
    }
    else{
       res.sendFile(path.join(__dirname,"template/borrowers/dashboard.html"))
    }
   
 
});


app.get("/book-details/:id", isAuthenticated, async (req, res) => {
    try {
        const book = await Books.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }
      
        return res.json(book);

      
    } catch (error) {
        console.error(error);
        // Respond with a user-friendly message
        res.status(500).json({ message: "An error occurred while fetching book details." });
    }
});


app.get("/book-details",isAuthenticated,async(req,res)=>{
    res.sendFile(path.join(__dirname,"./template/borrowers/bookdetails.html"))
})




app.post('/borrow/:borrowerId/:bookId', async (req, res) => {
    try {
        // Find the borrower and the book by their IDs
        const borrower = await Users.findById(req.params.borrowerId);
        const book = await Books.findById(req.params.bookId);
        
        if (borrower.borrowedBooks.includes(book._id)) {
            return res.status(400).json({ message: 'You cannot borrow the same book twice!' });
        }

        if (!borrower) {
            return res.status(404).json({ message: 'Borrower not found' });
        }
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        // Check if the book has available copies
        if (book.availableCopies <= 0) {
            return res.status(400).json({ message: 'No available copies left for borrowing.' });
        }

        // Calculate the due date (14 days from today)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        // Create the borrowing transaction
        const transaction = new Transaction({
            user: borrower._id,
            book: book._id,
            transactionType:"borrow",
            dueDate:dueDate,
            status:"active"
        });


        // Decrease the available copies of the book
        book.availableCopies -= 1;
        await book.save(); // Save the updated book

        // Save the transaction record
        await transaction.save();
        borrower.borrowedBooks.push(book._id)
        book.borrowers.push(borrower._id)
        await book.save()
        await borrower.save()

        // Send the response with the transaction details in JSON format
        res.status(201).json({
            message: 'Book borrowed successfully',
            transaction,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while borrowing the book.' });
    }
});

app.post('/return/:borrowerId/:bookId', async (req, res) => {
    try {
        const borrower = await Users.findById(req.params.borrowerId)
        const book = await Books.findById(req.params.bookId)


        if (!borrower) {
            return res.status(404).json({ message: 'Borrower not found' });
        }
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

    
        if (!borrower.borrowedBooks.includes(book._id)) {
            return res.status(400).json({ message: 'This book was not borrowed by the borrower' });
        }

        // Find the corresponding transaction for the borrowed book
        const transaction = await Transaction.findOne({
            user: borrower._id,
            book: book._id,
            transactionType: 'borrow',
            status:'active',
        })

        if (!transaction) {
            return res.status(404).json({ message: 'No active borrowing transaction found for this book' });
        }

        // Calculate late fee (if applicable)
        const today = new Date();
        const dueDate = new Date(transaction.dueDate);
        let lateFee = 0;

        if (today > dueDate) {
            const lateDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)); 
            lateFee = lateDays * 50;
        }

        // Update transaction to 'completed'
        transaction.status ='completed'
        transaction.transactionType="return"
        transaction.returnDate = today; 
        transaction.fineAmount = lateFee; 
        await transaction.save();

        book.availableCopies += 1;
        book.borrowers.pull(borrower._id)
        borrower.borrowedBooks.pull(book._id);
        await book.save();
        await borrower.save();


        // Send the response with the transaction details and late fee (if any)
        res.status(200).json({
            message: 'Book returned successfully',
            transaction,
            fineAmount: lateFee > 0 ? lateFee : null, // Only send late fee if there is one
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while returning the book.' });
    }
});

app.get('/admin-book-details',isAuthenticated,async(req,res)=>{
    res.sendFile(path.join(__dirname,'template/admin/book-details.html'))
})

app.get('/admin-checkUsers',isAuthenticated,async (req,res)=>{
    res.sendFile(path.join(__dirname,"template/admin/users.html"))
})

app.get('/admin-userHistory',isAuthenticated,async (req,res)=>{
    res.sendFile(path.join(__dirname,'template/admin/user-history.html'))
})


app.get('/admin-checkBorrowers', isAuthenticated, async (req, res) => {
    try {
        // Fetch all users from the database
        const users = await Users.find({ email: { $ne: "admin@gmail.com" } });

        // Map the users array to structure the response data
        const userDetails = users.map(user => ({
            username: user.username,
            email: user.email,
            phone: user.phone,
            id: user._id,
            date: user.createdAt
        }));

        // Send the array of user details as the response
        res.json(userDetails);
    } catch (error) {
        console.error("Error retrieving user data:", error);
        res.status(500).send("Error retrieving user data");
    }
});




app.get('/admin-book-details/:bookId',isAuthenticated,async (req,res)=>{
  try{
    const bookId=req.params.bookId
    const transction=await Transaction.find({book:bookId});
    const result=await Promise.all(transction.map(async (transction)=>{
        const user=await Users.findById(transction.user)
        return{
            user:{
                name:user.username,
                email:user.email

            },
            date:transction.transactionDate,
            status:transction.status
        }
    }));
    res.json(result)
  }
    catch (error) {
        console.error('Error fetching book details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
})

app.get('/admin-borrower-details/:borrowerId', isAuthenticated, async (req, res) => {
    try {
      const borrowerId = req.params.borrowerId;
      const transactions = await Transaction.find({ user: borrowerId });
  
      const result = await Promise.all(transactions.map(async (transaction) => {
        const book = await Books.findById(transaction.book);
        const fineAmount = calculateFine(transaction); // Add fine calculation logic here.
  
        return {
          book: {
            title: book.title,
            author: book.author,
          },
          date: transaction.transactionDate,
          status: transaction.status,
          fine: fineAmount,
        };
      }));
  
      res.json(result);
    } catch (error) {
      console.error('Error fetching borrower details:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Example fine calculation function (adjust as needed):
  function calculateFine(transaction) {
    const today = new Date();
    const dueDate = new Date(transaction.dueDate); // Assuming you have a dueDate field.
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert ms to days
  
    if (diffDays > 0) {
      return diffDays * 50; // Example: $1 fine per day overdue.
    }
    return 0;
  }
  


app.get("/borrow-lists",isAuthenticated,async (req,res)=>{
    res.sendFile(path.join(__dirname,'template/borrowers/borrow-list.html'))
})
app.get("/borrow-list/:userid", async (req, res) => {
    try {
        const userid = req.params.userid;
        
        // Find all transactions for the user with 'borrow' type
        const transactions = await Transaction.find({ user: userid, transactionType: 'borrow',status:"active"});

        // For each transaction, fetch the book details and calculate the remaining days
        const result = await Promise.all(transactions.map(async (transaction) => {
            const book = await Books.findById(transaction.book);
            return {
                transactionDate: transaction.transactionDate,
                dueDate: transaction.dueDate,
                
                book: {
                    _id:book._id,
                    title: book.title,
                    author: book.author
                },
                fine:transaction.fineAmount
            };
        }));

        // Send the combined response with book and transaction details
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while fetching the borrowed books.' });
    }
});



  
app.get('/borrower', isAuthenticated, async (req, res) => {
    try {
        const user = await Users.findById(req.session.userId);
        res.json({
            username: user.username,
            email: user.email,
            phone: user.phone,
            id:user._id,
            date:user.createdAt
            // Add any other data you need
        });
    } catch (error) {
        res.status(500).send("Error retrieving user data");
    }
});


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname,"template/login.html"));
});

app.listen(port, () => {
    console.log("Server is running at port " + port);
});
