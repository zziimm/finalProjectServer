const mongoose = require("mongoose");

const { Schema } = mongoose;
const basketSchema = new Schema({
  productId: {
    type: Number,
    required: true,
    unique: true
  },
  quantity: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model("Basket", basketSchema);