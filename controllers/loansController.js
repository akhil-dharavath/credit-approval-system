const asyncHandler = require("express-async-handler");
const loanData = require("../models/loanModel");
const Customer = require("../models/customerModel");
const { format } = require("date-fns");

async function calculateCreditScore(customer, loan_requested_amount) {
  const loansData = await loanData.find({ customer_id: customer.customer_id });
  let creditScore = 100; // Start with a maximum score of 100
  let loansPaidOnTime = 0;
  let sumOfCurrentLoans = 0;

  loansData.forEach((data) => {
    loansPaidOnTime += data["EMIs paid on Time"];
    sumOfCurrentLoans +=
      (data.tenure - data["EMIs paid on Time"]) * data.monthly_payment;
  });

  // i. Past Loans paid on time
  if (loansPaidOnTime < loansData.length) {
    // Reduce the score for late payments
    creditScore -= (loansData.length - loansPaidOnTime) * 5;
  }

  // ii. No of loans taken in past
  if (loansData.length > 5) {
    // Reduce the score if the user has taken more than 5 loans
    creditScore -= 10;
  }

  // iii. Loan activity in the current year
  const currentYear = new Date().getFullYear();
  const currentYearLoans = loansData.filter((loan) => {
    const loanYear = new Date(loan.start_date).getFullYear();
    return loanYear === currentYear;
  });
  if (currentYearLoans.length > 2) {
    creditScore -= 10;
  }

  // iv. Loan approved volume
  if (customer.approved_limit < 50000) {
    creditScore -= 15;
  }

  // v. If sum of current loans > approved limit, credit score = 0
  if (sumOfCurrentLoans + loan_requested_amount > customer.approved_limit) {
    creditScore = 0;
  }
  return creditScore;
}

// calculate monthly installment
function calculateMonthlyInstallment(userData, interest) {
  const { loan_amount: P, tenure: n } = userData;
  const t = n / 12;
  const r = interest;
  const numerator = P + (P * r * t) / 100;
  const monthlyPayment = numerator / n;
  return parseInt(monthlyPayment);
}

async function createNewLoan(userData, getLoan, creditScore) {
  const { customer_id, loan_amount, interest_rate, tenure } = userData;

  // generate loan id
  let loan_id = Math.floor(1000 + Math.random() * 9000);
  async function generateAndCheckLoanId(loanId) {
    const existingLoan = await loanData.find({ loan_id: loanId });
    if (existingLoan.length > 0) {
      loan_id = Math.floor(1000 + Math.random() * 9000);
      generateAndCheckLoanId(loan_id);
    }
  }
  await generateAndCheckLoanId(loan_id);

  // calculate monthly Installment
  const monthlyPayment = calculateMonthlyInstallment(userData, interest_rate);

  function addMonthsToDate(startDate, monthsToAdd) {
    const newDate = new Date(startDate);
    newDate.setMonth(newDate.getMonth() + monthsToAdd);
    newDate.setFullYear(newDate.getFullYear() + parseInt(monthsToAdd / 12));
    return newDate;
  }
  
  // calculate start date and end date
  const startDate = new Date();
  const tenureInMonths = tenure;
  let end_date = addMonthsToDate(startDate, tenureInMonths);

  let monthly_installment = 0;
  let interest = 0;

  // change intrest according to credit score
  if (creditScore > 50) {
    interest = interest_rate;
    monthly_installment = calculateMonthlyInstallment(userData, interest);
  }
  if (creditScore < 50 && creditScore > 30) {
    interest = interest_rate > 12 ? interest_rate : 12;
    monthly_installment = calculateMonthlyInstallment(userData, interest);
  }
  if (creditScore < 30 && creditScore > 10) {
    interest = interest_rate > 12 ? interest_rate : 16;
    monthly_installment = calculateMonthlyInstallment(userData, interest);
  }
  if (creditScore < 10) {
    interest = interest_rate > 12 ? interest_rate : 16;
  }

  // when getLoan = 0 just returning the eligiblity
  // when getLoan = 1 creating loan and returning the created loan details
  if (getLoan === 0) {
    if (creditScore > 10) {
      return [
        {
          customer_id,
          approval: true,
          interest_rate,
          corrected_interest_rate: interest_rate,
          tenure,
          monthly_installment,
        },
      ];
    } else {
      return [];
    }
  } else {
    if (creditScore > 10) {
      const createdLoan = await loanData.create({
        customer_id: customer_id,
        loan_id,
        loan_amount,
        tenure,
        interest_rate: interest,
        monthly_payment: parseInt(monthlyPayment),
        "EMIs paid on Time": 0,
        start_date: format(new Date(), "dd/MM/yyyy"),
        end_date: format(end_date, "dd/MM/yyyy"),
      });
      if (!createdLoan) {
        return [];
      }
      return [
        {
          customer_id,
          loan_id: createdLoan.loan_id,
          loan_approved: true,
          message: `your loan is approved with intrest rate of ${interest}`,
          monthly_installment,
        },
      ];
    } else {
      return [];
    }
  }
}

// @desc - check eligibility of loan
// @route - POST /loan/check-eligibility
// @access - public : According to the problem
const checkEligibility = asyncHandler(async (req, res) => {
  const { customer_id, loan_amount, interest_rate, tenure } = req.body;

  // check wheather all fields are entered
  if (!customer_id || !loan_amount || !interest_rate || !tenure) {
    res.status(400);
    throw new Error("All fields are mandatory");
  }

  // find customer and validate
  const customer = await Customer.findOne({ customer_id });
  if (!customer) {
    res.status(404);
    throw new Error("User not found");
  }

  // calculate credit score and check eligibility
  const creditScore = await calculateCreditScore(customer, loan_amount);
  const eligiblilityData = await createNewLoan(req.body, 0, creditScore);

  // if eligible give the output which was returned when called createNewLoan method else throw error from here
  if (eligiblilityData.length === 1) {
    res.status(200).json(eligiblilityData[0]);
  } else if (eligiblilityData.length === 0) {
    res.status(200).json({
      message:
        "We cannot approve your loan because your credit score is less than 10 or requested loan amount is exceeding the your total approved limit",
    });
  } else {
    res.status(500);
    throw new Error("Internal Server Error");
  }
});

// @desc - create new loan
// @route - POST /loan/create-loan
// @access - public : According to the problem
const createLoan = asyncHandler(async (req, res) => {
  const { customer_id, loan_amount, interest_rate, tenure } = req.body;

  // check wheather all fields are entered
  if (!customer_id || !loan_amount || !interest_rate || !tenure) {
    res.status(400);
    throw new Error("All fields are mandatory");
  }

  // find customer and validate
  const customer = await Customer.findOne({ customer_id });
  if (!customer) {
    res.status(400);
    throw new Error("Customer not found");
  }

  // calculate credit score and check eligibility
  const creditScore = await calculateCreditScore(customer, loan_amount);
  const eligiblilityData = await createNewLoan(req.body, 1, creditScore);

  // if eligible created already when it is called createNewLoan method else throw error from here
  if (eligiblilityData.length === 1) {
    res.json(eligiblilityData[0]);
  } else if (eligiblilityData.length === 0) {
    res.status(200).json({
      message:
        "We cannot approve your loan because your credit score is less than 10 or requested laon amount is exceeding the your total approved limit",
    });
  } else {
    res.status(500);
    throw new Error("Internal Server Error");
  }
});

// @desc - view loan which already had
// @route - GET /loan/view-loan:loan_id
// @access - public : According to the problem
const viewLoan = asyncHandler(async (req, res) => {
  const loan_id = req.params.loan_id;

  // find loan, customer and validate
  const loan = await loanData.findOne({ loan_id });
  if (loan.length === 0) {
    res.status(404);
    throw new Error("Loan details not found");
  }
  const customer = await Customer.findOne({ customer_id: loan.customer_id });
  if (customer.length === 0) {
    res.status(404);
    throw new Error("Loan details not found");
  }

  // output in some format
  res.status(200).json({
    loan_id,
    customer: {
      id: customer.customer_id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone_number: customer.phone_number,
      age: customer.age,
    },
    loan_amount: loan.loan_amount,
    interest_rate: loan.interest_rate,
    monthly_installment: loan.monthly_payment,
    tenure: loan.tenure,
  });
});

// @desc - make payment for loan
// @route - PUT /loan/make-payment:customer_id/:loan_id
// @access - public : According to the problem
const makePayment = asyncHandler(async (req, res) => {
  const customer_id = req.params.customer_id;
  const loan_id = req.params.loan_id;
  const payment_amount = req.body.payment_amount;

  // check wheather payment entered
  if (!payment_amount) {
    res.status(400);
    throw new Error("Invalid payment amount");
  }

  // find customer and loan and validate
  const customer = await Customer.findOne({ customer_id });
  const loan = await loanData.findOne({ loan_id });
  if (!customer || !loan) {
    res.status(400);
    throw new Error("Customer not found");
  }
  if (loan.customer_id !== parseInt(customer_id)) {
    res.status(400);
    throw new Error("Customer not found");
  }
  if (loan.monthly_payment !== payment_amount) {
    res.status(400);
    throw new Error("Invalid payment amount");
  }

  // loan to be updated as
  const updateLoan = {
    _id: loan._id,
    customer_id: loan.customer_id,
    loan_id: loan.loan_id,
    loan_amount: loan.loan_amount,
    tenure: loan.tenure,
    interest_rate: loan.interest_rate,
    monthly_payment: loan.monthly_payment,
    "EMIs paid on Time": loan["EMIs paid on Time"] + 1,
    start_date: loan.start_date,
    end_date: loan.end_date,
  };

  // loan updation
  await loanData.findByIdAndUpdate(loan._id, updateLoan);
  const updatedLoan = await loanData.findById(loan._id, { _id: 0 });
  res.status(200).json(updatedLoan);
});

// @desc - view loan statement and view all loans of the customer
// @route - GET /loan/view-statement:customer_id:loan_id
// @access - public : According to the problem
const viewStatement = asyncHandler(async (req, res) => {
  const customer_id = req.params.customer_id;
  const loan_id = req.params.loan_id;
  const customer = await Customer.findOne({ customer_id });
  const loan = await loanData.findOne({ loan_id });

  // check wheather loan and customer exists
  if (loan.length === 0 || customer.length === 0) {
    res.status(404);
    throw new Error("Loan details not found");
  }

  // check wheather the loan belongs to respective customer
  if (loan.customer_id !== parseInt(customer_id)) {
    res.status(404);
    throw new Error("Loan details not found");
  }

  const loansData = await loanData.find({ customer_id });
  res.status(200).json(
    loansData.map((data) => {
      return {
        customer_id: data.customer_id,
        loan_id: data.loan_id,
        principal: data.loan_amount,
        interest_rate: data.interest_rate,
        Amount_paid: data["EMIs paid on Time"] * data.monthly_payment,
        monthly_installment: data.monthly_payment,
        repayments_left: data.tenure - data["EMIs paid on Time"],
      };
    })
  );
});

module.exports = {
  checkEligibility,
  createLoan,
  viewLoan,
  makePayment,
  viewStatement,
};
