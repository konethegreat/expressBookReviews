const express = require('express');
const axios = require('axios');
const books = require('./booksdb.js');
const { isValid, users } = require('./auth_users.js');

const public_users = express.Router();

// Task 6: Register a new user
public_users.post("/register", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (username && password) {
        if (!isValid(username)) {
            users.push({ "username": username, "password": password });
            return res.status(200).json({ message: "User successfully registered. Now you can login" });
        } else {
            return res.status(404).json({ message: "User already exists!" });
        }
    }
    return res.status(404).json({ message: "Unable to register user." });
});

// Task 1: Get the book list available in the shop
public_users.get('/', function (req, res) {
    return res.status(200).send(JSON.stringify(books, null, 4));
});

// Task 2: Get book details based on ISBN
public_users.get('/isbn/:isbn', function (req, res) {
    const isbn = req.params.isbn;
    const book = books[isbn];
    if (book) {
        return res.status(200).json(book);
    } else {
        return res.status(404).json({ message: "Book not found" });
    }
});

// Task 3: Get book details based on author
public_users.get('/author/:author', function (req, res) {
    const author = req.params.author;
    const result = {};
    const keys = Object.keys(books);
    keys.forEach((key) => {
        if (books[key].author === author) {
            result[key] = books[key];
        }
    });
    if (Object.keys(result).length === 0) {
        return res.status(404).json({ message: "No books found for this author" });
    }
    return res.status(200).json(result);
});

// Task 4: Get all books based on title
public_users.get('/title/:title', function (req, res) {
    const title = req.params.title;
    const result = {};
    const keys = Object.keys(books);
    keys.forEach((key) => {
        if (books[key].title === title) {
            result[key] = books[key];
        }
    });
    if (Object.keys(result).length === 0) {
        return res.status(404).json({ message: "No books found with this title" });
    }
    return res.status(200).json(result);
});

// Task 5: Get book review
public_users.get('/review/:isbn', function (req, res) {
    const isbn = req.params.isbn;
    const book = books[isbn];
    if (book) {
        return res.status(200).json(book.reviews);
    } else {
        return res.status(404).json({ message: "Book not found" });
    }
});

/* ===========================================================
   Task 10: Async/Await with Axios - 4 methods
   These methods demonstrate using Promises and async/await
   with Axios to access the same data via HTTP.
   =========================================================== */

// Task 10a: Get all books - using async/await with Axios
const getAllBooks = async () => {
    try {
        const response = await axios.get('http://localhost:5000/');
        return response.data;
    } catch (error) {
        throw new Error("Error retrieving books: " + error.message);
    }
};

public_users.get('/async/books', async (req, res) => {
    try {
        const data = await getAllBooks();
        return res.status(200).send(data);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// Task 10b: Search by ISBN - using Promises with Axios
const getBookByISBN = (isbn) => {
    return new Promise((resolve, reject) => {
        axios.get(`http://localhost:5000/isbn/${isbn}`)
            .then((response) => resolve(response.data))
            .catch((error) => reject(error));
    });
};

public_users.get('/async/isbn/:isbn', (req, res) => {
    getBookByISBN(req.params.isbn)
        .then((data) => res.status(200).json(data))
        .catch((err) => res.status(500).json({ message: err.message }));
});

// Task 10c: Search by Author - using Promises with Axios
const getBookByAuthor = (author) => {
    return new Promise((resolve, reject) => {
        axios.get(`http://localhost:5000/author/${encodeURIComponent(author)}`)
            .then((response) => resolve(response.data))
            .catch((error) => reject(error));
    });
};

public_users.get('/async/author/:author', (req, res) => {
    getBookByAuthor(req.params.author)
        .then((data) => res.status(200).json(data))
        .catch((err) => res.status(500).json({ message: err.message }));
});

// Task 10d: Search by Title - using async/await with Axios
const getBookByTitle = async (title) => {
    try {
        const response = await axios.get(`http://localhost:5000/title/${encodeURIComponent(title)}`);
        return response.data;
    } catch (error) {
        throw new Error("Error retrieving by title: " + error.message);
    }
};

public_users.get('/async/title/:title', async (req, res) => {
    try {
        const data = await getBookByTitle(req.params.title);
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports.general = public_users;
