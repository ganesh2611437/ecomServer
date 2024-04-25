const express = require('express');
const router = express.Router();
const upload = require("../Middleware/Multer.js");
const verifyToken = require('../Middleware/Jwtauth.js');
const userApi = require('../Controllers/Usercontroller.js')
//Defining routes
router.post('/Register',upload.single('image') , userApi.registerUser);
router.post('/Login', userApi.loginUser);
router.patch('/updateprofile/:id',verifyToken,upload.single('image') , userApi.updateUser);
router.delete('/deleteprofile/:id',verifyToken,userApi.deleteUser );
router.post('/cart/addproduct/:id',verifyToken, userApi.cartAddProduct);
router.get('/cart',verifyToken, userApi.getCartProducts);
router.patch('/cart/editquantity/:id/:type', verifyToken, userApi.updateUserCart);
router.delete('/cart/delete/:id', verifyToken, userApi.deleteProductFromCart);
router.get('/cart/numberofitems' , verifyToken, userApi.getNumberofItems);
router.get('/manageorders',verifyToken,userApi.registerOrders );
router.get('/orders', verifyToken, userApi.getUserOrders);
router.get('/searchedproducts/:itemname', userApi.getSearchedItems);
module.exports = router;