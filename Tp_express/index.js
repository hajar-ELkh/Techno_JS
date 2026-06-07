const express = require("express");
const session = require("express-session");
const booksRouter = require("./books");
const authRouter = require("./server");

const app = express();

app.use(express.json());

app.use(session({
  secret: "secret-key",
  resave: false,
  saveUninitialized: false
}));

app.use("/server", authRouter);
app.use("/books", booksRouter);

app.listen(3000, () => console.log("Server running on port 3000"));