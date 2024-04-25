const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required :true,
    default: ''
  },
  image: {
    type: String,
    required :true,
    default: ''
  },
  role: {
    type: String,
    default: 'guest'
  },
  cart: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', 
    },
    quantity: {
      type: Number,
      default: 0
    }
  }],
  orders: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', 
    },
    quantity: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: 'Dispatched'
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Orders', 
    }
  }],
});

const Usermodel = mongoose.model('User', userSchema);

module.exports = Usermodel;
