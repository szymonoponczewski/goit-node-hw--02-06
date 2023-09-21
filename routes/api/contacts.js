const express = require("express");
const router = express.Router();
const ctrlContact = require("../../controller");
const ctrlUser = require("../../controller/users");

router.get("/", ctrlUser.auth, ctrlContact.get);

router.get("/:contactId", ctrlContact.getById);

router.delete("/:contactId", ctrlContact.remove);

router.post("/", ctrlContact.create);

router.put("/:contactId", ctrlContact.update);

router.patch("/:contactId/favorite", ctrlContact.favorite);

module.exports = router;
