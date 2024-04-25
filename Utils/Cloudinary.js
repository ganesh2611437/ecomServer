const cloudinary = require('cloudinary').v2;
const dotenv = require("dotenv");
dotenv.config();         
cloudinary.config({ 
  cloud_name: `${process.env.Cloudinary_Cloud_Name}` , 
  api_key: `${process.env.Cloudinary_Api_Key}`, 
  api_secret: `${process.env.Cloudinary_Api_Secret}` 
});
module.exports = cloudinary;