const express = require("express");
const router = express.Router();

// Middleware — protects all /books routes
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next(); //  authenticated → continue
  }
  return res.status(401).json({ message: "Unauthorized, please login first" });
}

router.use(isAuthenticated); // applied to ALL routes below

let books = [
  { id: 1, title: "The Hobbit", author: "Tolkien" },
  { id: 2, title: "1984",       author: "Orwell"  }
];

// GET /books → list all books
router.get("/list", (req, res) => {
  return res.json(books);
});

// POST /books → create a book
router.post("/cree", (req, res) => {
  const { title, author } = req.body;

  if (!title || !author) {
    return res.status(400).json({ message: "Title and author are required" });
  }

  const newBook = {
    id: books.length + 1,
    title,
    author
  };

  books.push(newBook);
  return res.status(201).json(newBook);
});

module.exports = router;