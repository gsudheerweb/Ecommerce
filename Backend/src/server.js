const dotenv = require("dotenv");
const path = require("path");
const express = require('express'); 
dotenv.config({ path: path.resolve(__dirname, '..', '.env') }); 
const app = require("./app");
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});