const express = require('express');
const calculatorController = require('../controllers/calculatorController');

const router = express.Router();

router.post('/calcular/rescisao', calculatorController.calcularRescisao);
router.post('/calcular/ferias', calculatorController.calcularFerias);
router.post('/calcular/decimo-terceiro', calculatorController.calcularDecimoTerceiro);
router.post('/calcular/hora-extra', calculatorController.calcularHoraExtra);
router.post('/calcular/fgts', calculatorController.calcularFgts);
router.post('/calcular/:calculator_type', calculatorController.calcularDinamico);
router.post('/simulacoes', calculatorController.saveSimulation);

module.exports = router;
