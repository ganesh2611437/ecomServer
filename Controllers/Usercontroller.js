const cloudinary = require("../Utils/Cloudinary.js");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const usermodel = require("../Models/Usermodel.js");
const productmodel = require("../Models/Productmodel.js");
const ordersmodel = require("../Models/Ordersmodel.js");
const dotenv = require("dotenv");
dotenv.config();
//Registeruser Controller
const registerUser = async (req, res) => {
  try {
    const { name, email, password, address } = req.body;
    if (!name || !email || !password || !address) {
      return res
        .status(400)
        .json({ error: "Please provide all required fields" });
    }
    const existingUser = await usermodel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please upload profile photo" });
    }
    try {
      const cloudinaryUpload = await cloudinary.uploader.upload(req.file.path, {
        folder: "Userimages",
      });

      if (cloudinaryUpload && cloudinaryUpload.secure_url) {
        const imageUrl = cloudinaryUpload.secure_url;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new usermodel({
          username: name,
          email,
          password: hashedPassword,
          address,
          image: imageUrl,
          role: "customer",
          cart: [],
          orders: [],
        });

        await newUser.save();
        return res.status(201).json({ message: "Registration Successful" });
      } else {
        return res
          .status(500)
          .json({ message: "Failed to Register, Try again later" });
      }
    } catch (error) {
      if (error.message.includes("File size too large")) {
        return res
          .status(400)
          .send({ message: "File size too large, Max: 10Mb" });
      }
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (req.file?.path) {
      fs.unlinkSync(req.file.path);
    }
  }
};
//Login Controller
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }
    const user = await usermodel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const payload = {
      userId: user._id,
      userRole: user.role,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    const { role, password: userPassword, ...userObject } = user.toObject();
    const userDetails = {
      token,
      userObject,
    };
    res.status(200).json({ userDetails });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
//update profile
const updateUser = async (req, res) => {
  try {
    // Find the user
    let userid = req.user.userId;
    let userID = req.params.id;
    if (userid !== userID) {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    const user = await usermodel.findById(userid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (req.body.newpassword) {
      const hashedPassword = await bcrypt.hash(req.body.newpassword, 10);
      user.password = hashedPassword;
    }
    if (req.file) {
      try {
        const oldImagePublicId = user.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`Userimages/${oldImagePublicId}`);
        const cloudinaryUpload = await cloudinary.uploader.upload(
          req.file.path,
          {
            folder: "Userimages",
          }
        );
        user.image = cloudinaryUpload.secure_url;
      } catch (error) {
        if (error.message.includes("File size too large")) {
          return res
            .status(400)
            .send({ message: "File size too large, Max: 10Mb" });
        }
      }
    }
    // Update the user with the new details
    user.username = req.body.name;
    user.email = req.body.email;
    user.address = req.body.address;
    const { password, role, ...rest } = user.toObject();
    // Save the updated user
    await user.save();
    res
      .status(200)
      .json({ message: "Profile updated successfully", user: rest });
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error });
    console.log(error);
  } finally {
    if (req.file?.path) {
      fs.unlinkSync(req.file.path);
    }
  }
};
//delete user
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const tokenUserID = req.user.userId;
    const userRole = req.user.userRole;
    if (userRole === "admin") {
      return res.status(403).json({ message: "Cannot delete admin id" });
    }
    // Check if the user IDs match
    if (userId !== tokenUserID) {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    await ordersmodel.deleteMany({ customer: userId });
    // Assuming UserModel has a method called deleteById to delete a user by ID
    const deletedUser = await usermodel.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user's image from Cloudinary
    const oldImagePublicId = deletedUser.image.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(`Userimages/${oldImagePublicId}`);

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
//cart add product
const cartAddProduct = async (req, res) => {
  let productID = req.params.id;
  let userid = req.user.userId;
  const userRole = req.user.userRole;
  if (userRole !== "customer") {
    return res.status(400).json({ message: "Login from customer id" });
  }
  try {
    const user = await usermodel.findById(userid);
    const productIndex = user.cart.findIndex(
      (item) => item.product.toString() === productID
    );

    if (productIndex > -1) {
      user.cart[productIndex].quantity += 1;
    } else {
      user.cart.push({ product: productID, quantity: 1 });
    }

    await user.save();
    res.status(200).json({ message: "Product added to cart successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while adding product to cart." });
  }
};
//get user cart
const getCartProducts = async (req, res) => {
  let userid = req.user.userId;
  const userRole = req.user.userRole;
  if (userRole !== "customer") {
    return res.status(400).json({ message: "Login from customer id" });
  }
  try {
    const user = await usermodel.findById(userid).populate("cart.product");
    let totalPrice = 0;
    user.cart.forEach((item) => {
      totalPrice += item.product.price * item.quantity;
    });
    res.status(200).json({ cart: user.cart, totalPrice: totalPrice });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching cart." });
  }
};
//update user cart
const updateUserCart = async (req, res) => {
  let userid = req.user.userId;
  let productId = req.params.id;
  let operationType = req.params.type;
  const userRole = req.user.userRole;
  if (userRole !== "customer") {
    return res.status(400).json({ message: "Login from customer id" });
  }
  try {
    const user = await usermodel.findById(userid);

    // Find the index of the product in the user's cart
    const productIndex = user.cart.findIndex(
      (cartItem) => cartItem.product.toString() === productId
    );

    // If the product is not in the cart, return an error
    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found in the cart." });
    }
    // If the operation type is 'add', increase the quantity by 1
    if (operationType === "add") {
      user.cart[productIndex].quantity += 1;
    }
    // If the operation type is 'subtract' and quantity is greater than 1, decrease by 1
    else if (operationType === "subtract") {
      if (user.cart[productIndex].quantity > 1) {
        user.cart[productIndex].quantity -= 1;
      } else {
        user.cart.splice(productIndex, 1);
      }
    } else {
      return res.status(400).json({ message: "Invalid operation type." });
    }
    // Save the updated user object
    await user.save();

    res.status(200).json({ message: "Quantity updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while updating the cart." });
  }
};
//delete Product from cart
const deleteProductFromCart = async (req, res) => {
  let userid = req.user.userId;
  let productId = req.params.id;
  const userRole = req.user.userRole;
  if (userRole !== "customer") {
    return res.status(400).json({ message: "Login from customer id" });
  }
  if (productId == "all") {
    // Update the user's cart by removing all products
    const updatedUser = await usermodel.findByIdAndUpdate(
      userid,
      { $set: { cart: [] } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "All products removed from cart" });
  }
  try {
    // Update the user's cart by removing the specified product
    const updatedUser = await usermodel.findByIdAndUpdate(
      userid,
      { $pull: { cart: { product: productId } } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "Product removed from cart" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
//get numberofitems
const getNumberofItems = async (req, res) => {
  try {
    const userid = req.user.userId;

    // Retrieve the user document
    const user = await usermodel.findById(userid);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Calculate the total number of items in the cart
    const numberOfItems = user.cart.reduce(
      (total, item) => total + item.quantity,
      0
    );

    return res.status(200).json({ numberOfItems });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
//register orders
const registerOrders = async (req, res) => {
  try {
    const userid = req.user.userId;

    // Find the user with the given userId
    const user = await usermodel.findById(userid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Loop through each product in the user's cart
    for (let item of user.cart) {
      const order = new ordersmodel({
        customer: userid,
        product: item.product,
        quantity: item.quantity,
        status: "Dispatched",
      });

      // Save the order
      await order.save();

      // Store the respective order ID in the user's orders.order field
      user.orders.push({
        product: item.product,
        quantity: item.quantity,
        status: "Dispatched",
        order: order._id, // Store the order ID
      });
    }

    user.cart = [];

    // Save the user
    await user.save();

    res.status(201).json({ message: "Order created successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while creating the order" });
  }
};
//get user orders
const getUserOrders = async (req, res) => {
  const userid = req.user.userId;
  try {
    const user = await usermodel.findById(userid).populate("orders.product");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user.orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
//get search items
const getSearchedItems = async (req, res) => {
  const item = req.params.itemname;
  try {
    const matchingProducts = await productmodel
      .find({ title: { $regex: new RegExp(item, "i") } })
      .limit(10)
      .exec();
    if (!matchingProducts) {
      res.status(200).json({ message: "no products found" });
    }
    res.status(200).json(matchingProducts);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
module.exports = {
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
  cartAddProduct,
  getCartProducts,
  updateUserCart,
  deleteProductFromCart,
  getNumberofItems,
  registerOrders,
  getUserOrders,
  getSearchedItems,
};
