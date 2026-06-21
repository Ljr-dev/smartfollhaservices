const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');
const { sanitize } = require('./helpers');

function loginPage(req, res) {
  res.render('login', {
    title: 'Login | Smart Folha Services',
    metaDescription: 'Acesso administrativo Smart Folha Services.',
    error: null,
    schema: null,
    page: null
  });
}

async function login(req, res) {
  try {
    const email = sanitize(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).render('login', {
        title: 'Login | Smart Folha Services',
        metaDescription: 'Acesso administrativo Smart Folha Services.',
        error: 'Informe e-mail e senha.',
        schema: null,
        page: null
      });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).render('login', {
        title: 'Login | Smart Folha Services',
        metaDescription: 'Acesso administrativo Smart Folha Services.',
        error: 'Credenciais invalidas.',
        schema: null,
        page: null
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).render('login', {
        title: 'Login | Smart Folha Services',
        metaDescription: 'Acesso administrativo Smart Folha Services.',
        error: 'Credenciais invalidas.',
        schema: null,
        page: null
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return res.redirect('/admin');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Erro ao autenticar.');
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('sfs.sid');
    res.redirect('/login');
  });
}

module.exports = {
  loginPage,
  login,
  logout
};
