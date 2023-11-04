const express = require("express");
const {
  checkEligibility,
  createLoan,
  viewLoan,
  makePayment,
  viewStatement,
} = require("../controllers/loansController");
const router = express.Router();

router.route("/check-eligibility").post(checkEligibility);
router.route("/create-loan").post(createLoan);
router.route("/view-loan/:loan_id").get(viewLoan);
router.route("/make-payment/:customer_id/:loan_id").put(makePayment);
router.route("/view-statement/:customer_id/:loan_id").get(viewStatement);

module.exports = router;
