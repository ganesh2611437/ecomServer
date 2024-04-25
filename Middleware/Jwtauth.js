const jwt = require('jsonwebtoken');
const dotenv = require("dotenv");
dotenv.config();         
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({message: 'Access Denied: No Token Provided!'}); 

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({message: 'Access Denied: Invalid Token!'});
    req.user = user;
    next();
  });
};

module.exports = verifyToken;
