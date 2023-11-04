const asyncHandler = require("express-async-handler");
const Customer = require("../models/customerModel");

// @desc - resgister user
// @route - POST /api/users/register
// @access - public
const registerUser = asyncHandler(async (req, res) => {
  const { first_name, last_name, age, monthly_income, phone_number } = req.body;
  if (!first_name || !last_name || !age || !monthly_income || !phone_number) {
    res.status(400);
    throw new Error("All fields are mandatory");
  }
  const customer = await Customer.find({});
  const approved_limit =
    monthly_income < 50000
      ? 3600000
      : 36 * Math.round(monthly_income / 100000) * 100000;
  const createCustomer = await Customer.create({
    customer_id: customer.length + 1,
    first_name,
    last_name,
    age,
    monthly_income,
    phone_number,
    approved_limit,
  });
  if (!createCustomer) {
    res.status(500);
    throw new Error("Internal Server Error");
  }
  const createdCustomer = await Customer.findOne({_id:createCustomer._id},{__v:0,_id:0})
  res.status(200).json(createdCustomer);
});

module.exports = { registerUser };
