const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const connectDb = require("./config/dbConnection");
const dotenv = require("dotenv").config();
const app = express();

connectDb();
const port = process.env.PORT || 5000

// middlewares
app.use(express.json());
app.use("/loan", require("./routes/loanRoutes"));
app.use("/customer", require("./routes/customerRoutes"));
app.use("*",(req,res)=>{res.status(404); throw new Error('Endpoint not found')});
app.use(errorHandler)

// server listening at port
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
