require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const { NODE_ENV } = require("./config");
const articlesRouter = require("./articles/articles-router");

const app = express();

const morganOption = NODE_ENV === "production" ? "tiny" : "common"; //or use dev in place of common

app.use(morgan(morganOption, { skip: () => NODE_ENV === "test" }));
app.use(helmet());
app.use(cors());

app.use("/articles", articlesRouter);

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

//sample malicious xss attack
app.get("/xss", (req, res) => {
  res.cookie("secretToken", "1234567890");
  res.sendFile(__dirname + "/xss-example.html");
});

//production app hides error messages from users & malicious parties
app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === "production") {
    response = { error: { message: "server error" } };
  } else {
    console.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

module.exports = app;
