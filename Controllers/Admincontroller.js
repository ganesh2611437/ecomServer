const cloudinary = require("../Utils/Cloudinary.js");
const fs = require("fs");
const productmodel = require("../Models/Productmodel.js");
const ordersmodel = require('../Models/Ordersmodel.js');
const usermodel = require('../Models/Usermodel.js')
const dotenv = require("dotenv");
dotenv.config();
//add product controller......................................................
const addproduct = async (req, res) => {
  const userRole = req.user.userRole;
  if (userRole !== "admin") {
    return res.status(400).json({ message: "Unauthorized" });
  }
  const { title, price, description, category, isFeatured } = req.body;
  // Check if all required fields are present in the request body
  if (
    !title ||
    !price ||
    !description ||
    !category ||
    !isFeatured ||
    !req.file
  ) {
    if (req.file?.path) {
      fs.unlinkSync(req.file.path);
    }
    return res
      .status(400)
      .json({ message: "Please provide all required fields" });
  }
  try {
    try {
      const cloudinaryUpload = await cloudinary.uploader.upload(req.file.path, {
        folder: "ProductImages",
      });
      // Create a new product using the ProductDetails model
      const newProduct = new productmodel({
        title,
        price,
        description,
        category,
        isFeatured,
        image: cloudinaryUpload.secure_url,
      });
      await newProduct.save();
      res.status(201).json({ message: "Product added successfully" });
    } catch (error) {
      if (error.message.includes("File size too large")) {
        res.status(400).send({ message: "File size too large, Max: 10Mb" });
      }
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (req.file?.path) {
      fs.unlinkSync(req.file.path);
    }
  }
};
//fetch single product
const fetchSingleProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productmodel.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
//delete single product........................................................
const deleteSingleProduct = async (req, res) => {
  const userRole = req.user.userRole;
  if (userRole !== "admin") {
    return res.status(400).json({ message: "Unauthorized" });
  }
  try {
    const productId = req.params.id;
    const product = await productmodel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const orders = await ordersmodel.find({ product: productId });
    for (let order of orders) {
      // Find the user who placed the order
    // Find the user who placed the order
    const user = await usermodel.findById(order.customer);

    // Remove the product from the user's cart
    user.cart = user.cart.filter(
      (cartItem) => cartItem.product.toString() !== productId
    );

    // Remove the order from the user's orders
    user.orders = user.orders.filter(
      (o) => o.order.toString() !== order._id.toString()
    );
    // Save the updated user
    await user.save();

      // Delete the order
      await ordersmodel.findByIdAndDelete(order._id);
    }
    // Find all users who have only the product in their cart
    const users = await usermodel.find({ "cart.product": productId });
    for (let user of users) {
      // Remove the product from the user's cart
      user.cart = user.cart.filter(
        (cartItem) => cartItem.product.toString() !== productId
      );

      // Save the updated user
      await user.save();
    }
    //delete product image from cloudinary
    const ImagePublicId = product.image.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(`ProductImages/${ImagePublicId}`);
    // Delete the product from the database
    await productmodel.findByIdAndDelete(productId);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
//Edit single product............................................................
const editSingleProduct = async (req, res) => {
  const userRole = req.user.userRole;
  if (userRole !== "admin") {
    if (req.file?.path) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ message: "Unauthorized" });
  }
  const productId = req.params.id;
  try {
    // Find the product
    const product = await productmodel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    // Check if all required fields exist in the request body
    const { title, description, price, category, isFeatured } = req.body;
    if (!title || !description || !price || !category || !isFeatured) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }
    if (req.file) {
      // Delete current product image from Cloudinary
      try {
        const oldImagePublicId = product.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`ProductImages/${oldImagePublicId}`);
      } catch (error) {
        // Handle Cloudinary deletion error
        fs.unlinkSync(req.file.path);
        return res
          .status(500)
          .json({ message: "Error deleting image from Cloudinary" });
      }
      // Upload new product image to Cloudinary
      try {
        const cloudinaryUpload = await cloudinary.uploader.upload(
          req.file.path,
          {
            folder: "ProductImages",
          }
        );
        product.image = cloudinaryUpload.secure_url;
      } catch (error) {
        // Handle Cloudinary upload error
        if (error.message.includes("File size too large")) {
          return res
            .status(400)
            .json({ message: "File size too large, Max: 10Mb" });
        }
        return res
          .status(500)
          .json({ message: "Error uploading image to Cloudinary" });
      }
    }
    // Update the product details
    product.title = title;
    product.description = description;
    product.price = price;
    product.category = category;
    product.isFeatured = isFeatured;
    // Save the updated product
    await product.save();
    res.status(200).json({ message: "Product updated successfully" });
  } catch (error) {
    // Handle general errors
    console.error("An error occurred:", error);
    res.status(500).json({ message: "An error occurred" });
  } finally {
    if (req.file?.path) {
      fs.unlinkSync(req.file.path);
    }
  }
};
//get products by category
const getProductsByCategory = async(req,res)=>{
  try {
    const category = req.params.category;

    // Retrieve all products if category is 'all'
    if (category === 'all') {
      const filteredProducts = await productmodel.find();
      return res.status(200).json({filteredProducts});
    }

    let filteredProducts;
    if (category === 'featured') {
      filteredProducts = await productmodel.find({ isFeatured: true });
    } else {
      filteredProducts = await productmodel.find({ category: category });
    }
    // Check if products are found for the specified category
    if (filteredProducts.length === 0) {
      return res.status(404).json({ message: `No products found for category: ${category}` });
    }

    return res.status(200).json({filteredProducts});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
//get all orders 
const getAllOrders = async(req,res)=>{
  try {
    const userRole = req.user.userRole;
    const userid = req.user.userId;

    if(userRole !== "admin"){
        return res.status(401).json({message: "Unauthorized"});
    }
    // Find all orders and populate the product and customer details
    const orders = await ordersmodel.find().populate('product').populate('customer');
    const modifiedOrders = orders.map(order => {
      return {
          ...order.toObject(),
          customer: {
              username: order.customer.username,
              address: order.customer.address
          }
      };
  });

    res.status(200).json({ orders : modifiedOrders });
} catch(error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while getting the orders' });
}
}
// update status for order 
const updateOrderStatus = async(req,res)=>{
  try {
    const userRole = req.user.userRole;
    const orderId = req.params.id;
    const status = req.body.status;
    // Check if user has admin role
    if (userRole !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find the order by ID
    const order = await ordersmodel.findById(orderId).populate('customer');

    // Check if the order exists
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    // Update the order status
    order.status = status;
    await order.save();
    const user = await usermodel.findById(order.customer._id);
    const userOrder = user.orders.find(o => o.order.toString() === order._id.toString());
    if(!userOrder){
      return res.status(404).json({ message: "Order not found" });
    }
    if(userOrder){
      userOrder.status = status;
      await user.save();
    }
    // Respond with success message
    return res.status(200).json({ message: "Order updated successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
module.exports = {
  addproduct,
  fetchSingleProduct,
  deleteSingleProduct,
  editSingleProduct,
  getProductsByCategory,
  getAllOrders,
  updateOrderStatus
};
