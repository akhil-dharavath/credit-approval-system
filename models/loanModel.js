const mongoose = require("mongoose");

const loanSchema = mongoose.Schema({
  customer_id: { type: Number, required: [true, "please Enter Customer Id"] },
  loan_id: { type: Number, required: true },
  loan_amount: { type: Number, required: [true, "please Enter Loan Amount"] },
  tenure: { type: Number, required: [true, "please Enter tenture"] },
  interest_rate: {
    type: Number,
    required: [true, "please Enter Intrest rate"],
  },
  monthly_payment: { type: Number, required: true },
  "EMIs paid on Time": { type: Number, required: true },
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
});

module.exports = mongoose.model("Loan_data", loanSchema);
