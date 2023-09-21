const Joi = require("joi");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const gravatar = require("gravatar");
const { nanoid } = require("nanoid");
const sgMail = require("@sendgrid/mail");
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path");
const { createUser, findUserByEmail } = require("../service");
const User = require("../service/schemas/users");
const uploadDir = path.join(process.cwd(), "tmp");
const createPublic = path.join(process.cwd(), "public");
const storeImage = path.join(createPublic, "avatars");
const Jimp = require("jimp");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const generateVerificationToken = () => {
  return nanoid(16);
};

const sendVerificationEmail = async (email, verificationToken) => {
  const tokenURL = `http://localhost:3000/api/users/verify/${verificationToken}`;

  const msg = {
    to: email,
    from: "szymon_o@mac.com",
    subject: "Email Verification",
    text: `Click the following link to verify your email: ${tokenURL} `,
  };

  try {
    await sgMail.send(msg);
    console.log("Verification email sent successfully.");
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
};

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const recheckUserSchema = Joi.object({
  email: Joi.string().email().required(),
});

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

const signup = async (req, res, next) => {
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

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    const avatarUrlPath = gravatar.url(email);
    const verificationToken = generateVerificationToken();

    const newUser = await createUser({
      email,
      password: hashedPassword,
      subscription: "starter",
      avatarUrl: avatarUrlPath,
      verificationToken,
    });

    sendVerificationEmail(email, verificationToken);

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
    const { body } = req;
    const { email, password } = body;
    const { error } = loginSchema.validate({ email, password });

    if (error) {
      return res.status(400).json({ message: "Validation error" });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Wrong email" });
    }

    const authMatch = bcrypt.compare(password, user.password);
    if (!authMatch) {
      return res.status(401).json({ message: "Wrong password" });
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

const logout = async (req, res, next) => {
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

const current = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    return res.status(200).json({
      email: user.email,
      subscription: user.subscription,
    });
  })(req, res, next);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
  limits: {
    fileSize: 1048576,
  },
});

const upload = multer({ storage: storage });

const avatars = async (req, res, next) => {
  const { path: temporaryName, originalname } = req.file;
  const fileName = path.join(uploadDir, originalname);

  const { user } = req;
  const { email } = user;
  const token = req.headers.authorization;
  const nickname = email.split("@")[0];
  const nicknameAvatarPath = `${storeImage}/${nickname}.jpg`;

  try {
    if (!token)
      return res.status(401).json({ message: "Token - Not authorized" });

    await fs.rename(temporaryName, fileName);
    const avatarPic = await Jimp.read(fileName);
    avatarPic.resize(250, 250).write(nicknameAvatarPath);
    user.avatarURL = nicknameAvatarPath;
    await user.save();
    await fs.unlink(fileName);
    const { avatarURL } = user;

    return res.status(200).json({ avatarURL });
  } catch (error) {
    await fs.unlink(temporaryName);
    return res.status(401).json({ message: "Error  - not authorized" });
  }
};

const verifyUser = async (req, res, next) => {
  const { verificationToken } = req.params;

  try {
    const user = await User.findOne({ verificationToken });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.verificationToken = null;
    user.verify = true;
    await user.save();

    return res.status(200).json({ message: "Verification successful" });
  } catch (error) {
    console.error("Verification error:", error);

    return res.status(500).json({ message: "Internal server error" });
  }
};

const recheckUser = async (req, res, next) => {
  try {
    const { email } = req.body;

    const { error } = recheckUserSchema.validate({ email });
    if (error) {
      return res.status(400).json({ message: "Missing required field email" });
    }

    const user = await findUserByEmail(email);
    const { verify, verificationToken } = user;

    if (verify) {
      return res
        .status(400)
        .json({ message: "Verification has already been passed" });
    }

    sendVerificationEmail(email, verificationToken);

    return res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    return res.status(500).send();
  }
};

module.exports = {
  signup,
  login,
  auth,
  logout,
  current,
  avatars,
  upload,
  uploadDir,
  storeImage,
  createPublic,
  verifyUser,
  recheckUser,
};
