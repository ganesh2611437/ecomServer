const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const UserRoute = require("./Routes/User.js");
const AdminRoute = require("./Routes/Admin.js");
const cookieParser = require("cookie-parser");
const axios = require("axios"); 
dotenv.config();
// Middleware setup
app.use(cors());
app.use(cookieParser());
app.use(express.json());
// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Database Connection successful");
  })
  .catch((error) => {
    console.log(error);
  });

  app.use('/api/user', UserRoute);
  app.use('/api/admin' , AdminRoute);
//Server start
app.listen(process.env.PORT,() => {
  console.log(`Server started on PORT ${process.env.PORT}`);
});
// Set up a timer to call the API every 12 minutes
const apiCallInterval = 12 * 60 * 1000; // 12 minutes in milliseconds

function makeApiCall() {
  axios.get("https://nextcartserver-it17.onrender.com/api/admin/products/all")
    .then(response => {
      console.log("API call successful");
    })
    .catch(error => {
      console.error("Error making API call:", error.message);
    });
}

// Initial API call
makeApiCall();

// Set up the interval to make API calls every 12 minutes
const apiCallTimer = setInterval(makeApiCall, apiCallInterval);
//Global error middleware
app.use((err, req, res, next) => {
  res.status(500).json({ message: "An error occurred"});
  next()
});

