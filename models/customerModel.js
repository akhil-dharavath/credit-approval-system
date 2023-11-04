const mongoose = require("mongoose");

const customerSchema = mongoose.Schema({
  customer_id: { type: Number, required: true },
  first_name: { type: String, required: [true, "Please enter First Name"] },
  last_name: { type: String, required: [true, "Please enter Last Name"] },
  age: { type: Number, required: [true, "Please enter Age"] },
  monthly_income: {
    type: Number,
    required: [true, "Please enter Monthly Income"],
  },
  phone_number: { type: Number, required: [true, "Please enter Phone Number"] },
  approved_limit:{ type: Number, required: true },
});

module.exports = mongoose.model("customers_data", customerSchema);
