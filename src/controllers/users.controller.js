const usersService = require('../services/users.service');

const list = async (req, res, next) => {
  try {
    const users = await usersService.findAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'name is required (string)' });
    }
    const created = await usersService.create({ name });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create };
