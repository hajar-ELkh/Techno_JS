const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Access denied"
    });
  }

  try {

    const token = authHeader.split(" ")[1];

    const verified = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = verified;

    next();

  } catch (error) {

    res.status(401).json({
      message: "Invalid token"
    });
  }
};