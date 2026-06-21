const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', adminController.dashboard);
router.get('/leads', adminController.leads);
router.get('/leads/:id', adminController.leadDetail);
router.post('/leads/:id/status', adminController.updateLeadStatus);
router.get('/calculadoras', adminController.calculadorasAdmin);
router.get('/calculadoras/nova', adminController.newCalculatorPage);
router.post('/calculadoras/nova', adminController.createCalculator);
router.get('/calculadoras/:id/editar', adminController.editCalculatorPage);
router.post('/calculadoras/:id/editar', adminController.updateCalculator);
router.get('/calculadoras/:id/campos/novo', adminController.newCalculatorFieldPage);
router.post('/calculadoras/:id/campos/novo', adminController.createCalculatorField);
router.get('/calculadoras/:id/campos/:fieldId/editar', adminController.editCalculatorFieldPage);
router.post('/calculadoras/:id/campos/:fieldId/editar', adminController.updateCalculatorField);
router.get('/formulas', adminController.formulas);
router.get('/formulas/nova', adminController.newFormulaPage);
router.post('/formulas/nova', adminController.createFormula);
router.get('/formulas/:id/editar', adminController.editFormulaPage);
router.post('/formulas/:id/editar', adminController.updateFormula);
router.get('/paginas', adminController.paginas);
router.get('/paginas/:id/editar', adminController.editPage);
router.post('/paginas/:id/editar', adminController.updatePage);
router.get('/simulacoes', adminController.simulacoes);
router.get('/configuracoes', adminController.configuracoes);
router.post('/configuracoes', adminController.updateConfiguracoes);

module.exports = router;
