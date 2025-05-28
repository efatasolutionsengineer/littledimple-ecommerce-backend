const knex = require('../db/knex');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// /**
//  * @swagger
//  * /api/users/register:
//  *   post:
//  *     summary: Register a new user
//  *     tags: [Auth]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - username
//  *               - email
//  *               - password
//  *             properties:
//  *               username:
//  *                 type: string
//  *                 example: johndoe
//  *               email:
//  *                 type: string
//  *                 format: email
//  *                 example: johndoe@example.com
//  *               password:
//  *                 type: string
//  *                 format: password
//  *                 example: strongpassword123
//  *     responses:
//  *       201:
//  *         description: User registered successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 code:
//  *                   type: string
//  *                   example: ""
//  *                 status:
//  *                   type: string
//  *                   example: success
//  *                 message:
//  *                   type: string
//  *                   example: User registered successfully
//  *                 data:
//  *                   type: array
//  *                   items:
//  *                     type: object
//  *                     properties:
//  *                       id:
//  *                         type: integer
//  *                         example: 1
//  *                       username:
//  *                         type: string
//  *                         example: johndoe
//  *                       email:
//  *                         type: string
//  *                         example: johndoe@example.com
//  *       400:
//  *         description: Email or username already exists
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 code:
//  *                   type: string
//  *                   example: USER_REGISTRATION_FAILED
//  *                 status:
//  *                   type: string
//  *                   example: error
//  *                 message:
//  *                   type: string
//  *                   example: Email or username already exists
//  *                 data:
//  *                   type: array
//  *                   example: []
//  */
// const register = async (req, res) => {
//   const { username, email, password } = req.body;

//   try {
//     const hash = await bcrypt.hash(password, 10);

//     const [user] = await knex('users')
//       .insert({
//         username,
//         email,
//         password: hash
//       })
//       .returning(['id', 'username', 'email']);

//     res.status(201).json({
//       code: "",
//       status: "success",
//       message: "User registered successfully",
//       data: [user]
//     });
//   } catch (err) {
//     res.status(400).json({
//       code: "USER_REGISTRATION_FAILED",
//       status: "error",
//       message: "Email or username already exists",
//       data: []
//     });
//   }
// };

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await knex('users').where({ email }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    maxAge: 3600000, // 1 jam
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.json({ message: 'Login successful' });
};

const profile = async (req, res) => {
  const user = await knex('users').where({ id: req.user.id }).first();
  res.json({ id: user.id, username: user.username, email: user.email });
};

module.exports = { login, profile }; //register
