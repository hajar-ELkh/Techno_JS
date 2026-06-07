const express = require("express");
const router = express.Router();

// POST /server/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin") {
    req.session.isAuthenticated = true;
    return res.json({ message: "Logged in successfully" });
  }

  return res.status(401).json({ message: "Invalid credentials" });
});

// POST /server/logout
router.post("/logout", (req, res) => {
  req.session.destroy();
  return res.json({ message: "Logged out successfully" });
});

module.exports = router;