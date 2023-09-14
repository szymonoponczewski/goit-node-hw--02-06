const Joi = require("joi");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { createUser, findUserByEmail } = require("../service");
const User = require("../service/schemas/users");

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const signup = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { error } = signupSchema.validate({ email, password });

    if (error) {
      return res.status(400).json({ message: "Validation error" });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "Email in use" });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = await createUser({
      email,
      password: hashedPassword,
      subscription: "starter",
    });

    return res.status(201).json({
      user: {
        email: newUser.email,
        subscription: newUser.subscription,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { error } = loginSchema.validate({ email, password });

    if (error) {
      return res.status(400).json({ message: "Validation error" });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Email or password is wrong" });
    }

    const authMatch = bcrypt.compareSync(password, user.password);
    if (!authMatch) {
      return res.status(401).json({ message: "Email or password is wrong" });
    }

    const secret = process.env.SECRET;
    const payload = {
      id: user._id,
      email: user.email,
      subscription: user.subscription,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "1h" });
    return res.status(200).json({
      token,
      user: {
        email: user.email,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const auth = async (req, res, next) => {
  try {
    passport.authenticate("jwt", { session: false }, (err, user) => {
      if (!user || err) {
        return res.status(401).json({ message: "Not authorized" });
      }

      req.user = user;
      next();
    })(req, res, next);
  } catch (error) {
    console.error("Authorization error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await User.findByIdAndUpdate(userId, { token: null });

    return res.status(204).send();
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = {
  signup,
  login,
  auth,
  logout,
};
