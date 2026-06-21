const express = require('express');
const path = require('path');
const session = require('express-session');

const siteRoutes = require('./routes/siteRoutes');
const calculatorRoutes = require('./routes/calculatorRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(
  session({
    name: 'sfs.sid',
    secret: process.env.SESSION_SECRET || 'trocar_essa_chave',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.adminUser = req.session.user || null;
  res.locals.site = {
    companyName: 'Smart Folha Services',
    whatsapp: '5599999999999',
    email: 'contato@smartfolhaservices.com.br',
    instagram: '',
    linkedin: '',
    footerText: 'Consultoria em folha de pagamento, Departamento Pessoal e eSocial.'
  };
  next();
});

app.use('/', siteRoutes);
app.use('/', authRoutes);
app.use('/api', calculatorRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('index', {
    title: 'Pagina nao encontrada | Smart Folha Services',
    metaDescription: 'Pagina nao encontrada.',
    page: null,
    services: [],
    schema: null,
    errorMessage: 'Pagina nao encontrada.'
  });
});

module.exports = app;
