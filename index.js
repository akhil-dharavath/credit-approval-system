const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const connectDb = require("./config/dbConnection");
const dotenv = require("dotenv").config();
const cors = require('cors');
const app = express();

connectDb();
const port = process.env.PORT || 5000

app.use(express.json());
app.use(cors());

// middlewares
app.use("/loan", require("./routes/loanRoutes"));
app.use("/customer", require("./routes/customerRoutes"));
app.use("*",(req,res)=>{res.status(404); throw new Error('Endpoint not found')});
app.use(errorHandler)

// server listening at port
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
