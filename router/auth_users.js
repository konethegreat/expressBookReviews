const express = require('express');
const jwt = require('jsonwebtoken');
const books = require('./booksdb.js');

const regd_users = express.Router();

let users = [];

const isValid = (username) => {
    return users.some((u) => u.username === username);
};

const authenticatedUser = (username, password) => {
    return users.some((u) => u.username === username && u.password === password);
};

// Task 7: Login as a registered user
regd_users.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        return res.status(404).json({ message: "Error logging in. Username/password required." });
    }

    if (authenticatedUser(username, password)) {
        const accessToken = jwt.sign({ data: username }, 'access', { expiresIn: 60 * 60 });
        req.session.authorization = { accessToken, username };
        return res.status(200).send("User successfully logged in");
    } else {
        return res.status(208).json({ message: "Invalid Login. Check username and password" });
    }
});

// Task 8: Add or modify a book review (logged in users only)
regd_users.put("/auth/review/:isbn", (req, res) => {
    const isbn = req.params.isbn;
    const review = req.query.review;
    const username = req.session.authorization.username;

    if (!books[isbn]) {
        return res.status(404).json({ message: "Book not found" });
    }
    if (!review) {
        return res.status(400).json({ message: "Review query parameter is required" });
    }

    books[isbn].reviews[username] = review;
    return res.status(200).json({
        message: `Review for the book with ISBN ${isbn} has been added/modified.`,
        reviews: books[isbn].reviews
    });
});

// Task 9: Delete a book review (only the user's own review)
regd_users.delete("/auth/review/:isbn", (req, res) => {
    const isbn = req.params.isbn;
    const username = req.session.authorization.username;

    if (!books[isbn]) {
        return res.status(404).json({ message: "Book not found" });
    }

    if (books[isbn].reviews[username]) {
        delete books[isbn].reviews[username];
        return res.status(200).json({
            message: `Review for the book with ISBN ${isbn} posted by ${username} has been deleted.`,
            reviews: books[isbn].reviews
        });
    } else {
        return res.status(404).json({ message: "Review not found for this user" });
    }
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;
