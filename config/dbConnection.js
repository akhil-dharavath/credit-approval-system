const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log("Connected to the Database");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDb;

