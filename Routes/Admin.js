const express = require('express');
const router = express.Router();
const upload = require("../Middleware/Multer.js");
const verifyToken = require('../Middleware/Jwtauth.js'); 
const adminApi = require('../Controllers/Admincontroller.js')
//Defining the routes
router.get('/products/:category',adminApi.getProductsByCategory);
router.get('/product/:id', adminApi.fetchSingleProduct );
router.delete('/product/:id',verifyToken, adminApi.deleteSingleProduct);
router.post('/addproduct', verifyToken, upload.single('image'), adminApi.addproduct);
router.patch('/editproduct/:id', verifyToken, upload.single('image'), adminApi.editSingleProduct);
router.get('/orders', verifyToken, adminApi.getAllOrders);
router.patch('/updateorder/:id',verifyToken,adminApi.updateOrderStatus)
module.exports =router;