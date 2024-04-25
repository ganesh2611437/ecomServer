const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ordersModel = new Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true
      },
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', 
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      status:{
        type: String,
        default: "Dispatched"
      }
});
const ordersmodel =  mongoose.model('Orders' ,ordersModel);
module.exports = ordersmodel;