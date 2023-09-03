const express = require("express");
const router = express.Router();
const Joi = require("joi");

const {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
} = require("./../../models/contacts");

const addSchema = Joi.object({
  name: Joi.string()
    .pattern(/^[A-Za-z\s]+$/)
    .required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
});

const editSchema = Joi.object({
  name: Joi.string().pattern(/^[A-Za-z\s]+$/),
  email: Joi.string().email(),
  phone: Joi.string(),
}).unknown(false);



router.get("/", async (req, res, next) => {
  try {
    const contactsList = await listContacts();
    res.status(200).json(contactsList);
  } catch (error) {
    console.log("Error occurred:", error);
  }
});

router.get("/:contactId", async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const contactById = await getContactById(contactId);

    if (contactById) {
      res.status(200).json(contactById);
    } else {
      res.status(404).json({ message: "Contact not found" });
    }
  } catch (error) {
    console.log("Error occurred:", error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = req.body;
    const validationResult = addSchema.validate(body);

    if (validationResult.error) {
      res.status(400).send({ message: "All fields are required" });
    } else {
      const newContact = await addContact(body);
      res.status(201).json({
        message: "Contact has been added",
        data: { newContact },
      });
    }
  } catch (error) {
    console.log("Error occurred:", error);
  }
});

router.delete("/:contactId", async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const contactIsRemoved = await removeContact(contactId);

    if (contactIsRemoved) {
      res.status(200).json({ message: "Contact has been removed" });
    } else {
      res.status(404).json({ message: "Contact not found" });
    }
  } catch (error) {
    console.log("Error occurred:", error);
  }
});

router.put("/:contactId", async (req, res, next) => {
  const { contactId } = req.params;
  const body = req.body;
  const validationResult = editSchema.validate(body);

  if (validationResult.error) {
    res.status(400).json({ message: "All fields are required" });
  }

  try {
    const updatedContact = await updateContact(contactId, body);

    if (!updatedContact) {
      res.status(404).json(`Contact ${contactId} not found`);
    } else {
      res
        .status(200)
        .json({ message: "Contact has been edited", data: { updatedContact } });
    }
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
