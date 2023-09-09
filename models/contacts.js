const fs = require("fs").promises;
const path = require("path");
const { nanoid } = require("nanoid");

const contactsPath = path.join(__dirname, "contacts.json");

const listContacts = async () => {
  try {
    const data = await fs.readFile(contactsPath);
    const contacts = JSON.parse(data);

    return contacts;
  } catch (error) {
    console.log("Error occurred:", error.message);
  }
};

const getContactById = async (contactId) => {
  try {
    const contacts = await listContacts();
    const matchId = contacts.find((contact) => contact.id === contactId);

    return matchId;
  } catch (error) {
    console.log("Error occurred:", error.message);
  }
};

const removeContact = async (contactId) => {
  try {
    const contacts = await listContacts();

    const contactToRemove = contacts.find(
      (contact) => contact.id === contactId
    );
    if (!contactToRemove) {
      console.log("There is no such contact on the list.");

      return false;
    }
    const filteredContacts = contacts.filter(
      (contact) => contact.id !== contactId
    );

    await fs.writeFile(contactsPath, JSON.stringify(filteredContacts));

    return true;
  } catch (error) {
    console.log("Error occurred:", error.message);
    return false;
  }
};

const addContact = async (body) => {
  try {
    const { name, email, phone } = body;
    const newContact = { id: nanoid(), name, email, phone };

    const contacts = await listContacts();

    contacts.push(newContact);

    await fs.writeFile(contactsPath, JSON.stringify(contacts));

    return newContact;
  } catch (error) {
    console.log("Error occurred:", error.message);
  }
};

const updateContact = async (contactId, body) => {
  try {
    const contacts = await listContacts();
    const contactToUpdate = contacts.find(
      (contact) => contact.id === contactId
    );

    if (!contactToUpdate) {
      console.log("There is no such contact on the list.");

      return false;
    }

    Object.assign(contactToUpdate, body);

    await fs.writeFile(contactsPath, JSON.stringify(contacts));

    return contactToUpdate;
  } catch (error) {
    console.log("Error occurred:", error.message);

    return false;
  }
};

module.exports = {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
};
