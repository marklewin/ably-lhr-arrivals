require("dotenv").config();

const express = require("express");
const Ably = require("ably");
const app = express();
const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY });

app.use(express.static("public"));

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

app.get("/auth", (req, res) => {
  let tokenParams = {
    ttl: 30000,
    clientId: req.query.id,
  };
  ably.auth.createTokenRequest(tokenParams, (err, tokenRequest) => {
    if (err) {
      res.status(500).send("Authentication error: " + JSON.stringify(err));
    } else {
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(tokenRequest));
    }
  });
});

const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
