const express = require("express");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const app = express();

const client = jwksClient({
  jwksUri: process.env.JWKS_URI || "http://keycloak:8080/realms/poc-realm/protocol/openid-connect/certs"
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function validateToken(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).send("Missing token");

  const token = authHeader.split(" ")[1];

  jwt.verify(token, getKey, {
    issuer: process.env.JWT_ISSUER || "http://keycloak:8080/realms/poc-realm",
    algorithms: ["RS256"]
  },
    function (err, decoded) {

      if (err)
        return res.status(401).send(err.message);

      // Validación de Client ID (azp)
      const allowedClient = process.env.ALLOWED_CLIENT || "api-a";
      if (decoded.azp !== allowedClient) {
        return res.status(403).send(`Forbidden: Token issued for ${decoded.azp}, but this API only accepts ${allowedClient}`);
      }

      req.user = decoded;

      next();
    });
}

app.get("/", (req, res) => res.send("API A is running"));

app.get("/api/getEspecificData", validateToken, (req, res) => {
  res.json({
    message: "Secure data",
    client: req.user.clientId || req.user.azp,
    subject: req.user.sub
  });
});

app.listen(3000, () =>
  console.log("API running")
);