const express = require("express");
const router = express.Router();
const ctrlContact = require("../../controller/users");

router.post("/signup", ctrlContact.signup);

router.post("/login", ctrlContact.login);

router.get("/logout", ctrlContact.auth, ctrlContact.logout);

router.get("/current", ctrlContact.auth, ctrlContact.current);

router.patch("/subscription", ctrlContact.auth, ctrlContact.subscription);

module.exports = router;
