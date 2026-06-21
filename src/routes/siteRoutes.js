const express = require('express');
const siteController = require('../controllers/siteController');

const router = express.Router();

router.get('/', siteController.home);
router.get('/servicos', siteController.servicos);
router.get('/calculadoras', siteController.calculadoras);
router.get('/calculadora-rescisao', siteController.calculadoraRescisao);
router.get('/calculadora-ferias', siteController.calculadoraFerias);
router.get('/calculadora-decimo-terceiro', siteController.calculadoraDecimoTerceiro);
router.get('/calculadora-hora-extra', siteController.calculadoraHoraExtra);
router.get('/calculadora-fgts', siteController.calculadoraFgts);
router.get('/calculadora-:slug', siteController.dynamicCalculator);
router.get('/contato', siteController.contato);
router.post('/contato', siteController.sendContact);
router.get('/robots.txt', siteController.robots);
router.get('/sitemap.xml', siteController.sitemap);

module.exports = router;
