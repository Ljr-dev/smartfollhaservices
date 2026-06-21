const LeadModel = require('../models/LeadModel');
const SimulationModel = require('../models/SimulationModel');
const FormulaModel = require('../models/FormulaModel');
const CalculatorModel = require('../models/CalculatorModel');
const PageModel = require('../models/PageModel');
const SettingModel = require('../models/SettingModel');
const { sanitize, parseJson } = require('./helpers');

function adminView(res, view, data = {}) {
  res.render(`admin/${view}`, {
    title: data.title || 'Painel | Smart Folha Services',
    ...data
  });
}

async function dashboard(req, res) {
  try {
    const [totalLeads, novosLeads, totalSimulations, simulationsByType, latestLeads] = await Promise.all([
      LeadModel.countAll(),
      LeadModel.countByStatus('Novo'),
      SimulationModel.countAll(),
      SimulationModel.countByType(),
      LeadModel.latest(5)
    ]);

    adminView(res, 'dashboard', {
      title: 'Dashboard | Smart Folha Services',
      totalLeads,
      novosLeads,
      totalSimulations,
      simulationsByType,
      latestLeads
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar dashboard.');
  }
}

async function leads(req, res) {
  try {
    const status = sanitize(req.query.status);
    const leadsList = await LeadModel.findAll(status);
    adminView(res, 'leads', {
      title: 'Leads | Smart Folha Services',
      leads: leadsList,
      status
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar leads.');
  }
}

async function leadDetail(req, res) {
  try {
    const lead = await LeadModel.findById(req.params.id);
    if (!lead) return res.status(404).send('Lead nao encontrado.');
    adminView(res, 'lead-detalhe', {
      title: `Lead ${lead.name} | Smart Folha Services`,
      lead
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar lead.');
  }
}

async function updateLeadStatus(req, res) {
  try {
    const allowed = ['Novo', 'Em atendimento', 'Convertido', 'Perdido'];
    const status = sanitize(req.body.status);
    if (!allowed.includes(status)) return res.status(400).send('Status invalido.');
    await LeadModel.updateStatus(req.params.id, status);
    res.redirect(`/admin/leads/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao atualizar status.');
  }
}

async function formulas(req, res) {
  try {
    const calculatorType = sanitize(req.query.calculator_type);
    const [formulasList, calculators] = await Promise.all([
      FormulaModel.findAll(calculatorType),
      CalculatorModel.findAll()
    ]);
    adminView(res, 'formulas', {
      title: 'Formulas | Smart Folha Services',
      formulas: formulasList,
      calculators,
      calculatorType
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar formulas.');
  }
}

async function editFormulaPage(req, res) {
  try {
    const formula = await FormulaModel.findById(req.params.id);
    if (!formula) return res.status(404).send('Formula nao encontrada.');
    adminView(res, 'formula-editar', {
      title: 'Editar formula | Smart Folha Services',
      formula,
      isNew: false
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar formula.');
  }
}

async function newFormulaPage(req, res) {
  try {
    const calculators = await CalculatorModel.findAll();
    const calculatorType = sanitize(req.query.calculator_type);
    adminView(res, 'formula-editar', {
      title: 'Nova formula | Smart Folha Services',
      formula: {
        calculator_type: calculatorType,
        field_name: '',
        label: '',
        description: '',
        formula_expression: '',
        legal_observation: '',
        active: 1
      },
      calculators,
      isNew: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar formula.');
  }
}

async function createFormula(req, res) {
  try {
    await FormulaModel.create({
      calculator_type: sanitize(req.body.calculator_type),
      field_name: sanitize(req.body.field_name),
      label: sanitize(req.body.label),
      description: sanitize(req.body.description),
      formula_expression: sanitize(req.body.formula_expression),
      legal_observation: sanitize(req.body.legal_observation),
      active: req.body.active === '1'
    });
    res.redirect(`/admin/formulas?calculator_type=${encodeURIComponent(sanitize(req.body.calculator_type))}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao salvar formula.');
  }
}

async function updateFormula(req, res) {
  try {
    await FormulaModel.update(req.params.id, {
      field_name: sanitize(req.body.field_name),
      label: sanitize(req.body.label),
      description: sanitize(req.body.description),
      formula_expression: sanitize(req.body.formula_expression),
      legal_observation: sanitize(req.body.legal_observation),
      active: req.body.active === '1'
    });
    res.redirect('/admin/formulas');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao salvar formula.');
  }
}

function optionsToJson(rawOptions) {
  const options = String(rawOptions || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, label] = line.includes('|') ? line.split('|') : [line, line];
      return {
        value: sanitize(value),
        label: sanitize(label)
      };
    });
  return JSON.stringify(options);
}

function optionsToText(field) {
  return (field.options || [])
    .map((option) => `${option.value}|${option.label}`)
    .join('\n');
}

function calculatorPayload(body) {
  return {
    calculator_type: sanitize(body.calculator_type),
    slug: sanitize(body.slug),
    title: sanitize(body.title),
    description: sanitize(body.description),
    cta_text: sanitize(body.cta_text),
    active: body.active === '1',
    sort_order: Number(body.sort_order || 0)
  };
}

function fieldPayload(body) {
  return {
    field_name: sanitize(body.field_name),
    label: sanitize(body.label),
    input_type: sanitize(body.input_type) || 'number',
    required: body.required === '1',
    placeholder: sanitize(body.placeholder),
    default_value: sanitize(body.default_value),
    min_value: sanitize(body.min_value),
    max_value: sanitize(body.max_value),
    step_value: sanitize(body.step_value),
    options_json: optionsToJson(body.options_text),
    help_text: sanitize(body.help_text),
    sort_order: Number(body.sort_order || 0),
    active: body.active === '1'
  };
}

async function calculadorasAdmin(req, res) {
  try {
    const calculators = await CalculatorModel.findAll();
    adminView(res, 'calculadoras', {
      title: 'Calculadoras | Smart Folha Services',
      calculators
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar calculadoras.');
  }
}

async function newCalculatorPage(req, res) {
  adminView(res, 'calculadora-editar', {
    title: 'Nova calculadora | Smart Folha Services',
    calculator: {
      calculator_type: '',
      slug: '',
      title: '',
      description: '',
      cta_text: 'Calcular',
      active: 1,
      sort_order: 0
    },
    fields: [],
    formulas: [],
    isNew: true
  });
}

async function createCalculator(req, res) {
  try {
    const id = await CalculatorModel.create(calculatorPayload(req.body));
    res.redirect(`/admin/calculadoras/${id}/editar`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao salvar calculadora.');
  }
}

async function editCalculatorPage(req, res) {
  try {
    const calculator = await CalculatorModel.findById(req.params.id);
    if (!calculator) return res.status(404).send('Calculadora nao encontrada.');
    const [fields, formulas] = await Promise.all([
      CalculatorModel.fields(calculator.id),
      FormulaModel.findAll(calculator.calculator_type)
    ]);
    adminView(res, 'calculadora-editar', {
      title: 'Editar calculadora | Smart Folha Services',
      calculator,
      fields,
      formulas,
      isNew: false
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar calculadora.');
  }
}

async function updateCalculator(req, res) {
  try {
    await CalculatorModel.update(req.params.id, calculatorPayload(req.body));
    res.redirect(`/admin/calculadoras/${req.params.id}/editar`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao salvar calculadora.');
  }
}

async function newCalculatorFieldPage(req, res) {
  try {
    const calculator = await CalculatorModel.findById(req.params.id);
    if (!calculator) return res.status(404).send('Calculadora nao encontrada.');
    adminView(res, 'calculadora-campo-editar', {
      title: 'Novo campo | Smart Folha Services',
      calculator,
      field: {
        field_name: '',
        label: '',
        input_type: 'number',
        required: 1,
        placeholder: '',
        default_value: '',
        min_value: '',
        max_value: '',
        step_value: '0.01',
        help_text: '',
        sort_order: 0,
        active: 1,
        options_text: ''
      },
      isNew: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar campo.');
  }
}

async function createCalculatorField(req, res) {
  try {
    await CalculatorModel.createField(req.params.id, fieldPayload(req.body));
    res.redirect(`/admin/calculadoras/${req.params.id}/editar`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao salvar campo.');
  }
}

async function editCalculatorFieldPage(req, res) {
  try {
    const [calculator, field] = await Promise.all([
      CalculatorModel.findById(req.params.id),
      CalculatorModel.fieldById(req.params.fieldId)
    ]);
    if (!calculator || !field) return res.status(404).send('Campo nao encontrado.');
    adminView(res, 'calculadora-campo-editar', {
      title: 'Editar campo | Smart Folha Services',
      calculator,
      field: {
        ...field,
        options_text: optionsToText(field)
      },
      isNew: false
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar campo.');
  }
}

async function updateCalculatorField(req, res) {
  try {
    await CalculatorModel.updateField(req.params.fieldId, fieldPayload(req.body));
    res.redirect(`/admin/calculadoras/${req.params.id}/editar`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao salvar campo.');
  }
}

async function paginas(req, res) {
  try {
    const pages = await PageModel.findAll();
    adminView(res, 'paginas', {
      title: 'Paginas | Smart Folha Services',
      pages
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar paginas.');
  }
}

async function editPage(req, res) {
  try {
    const page = await PageModel.findById(req.params.id);
    if (!page) return res.status(404).send('Pagina nao encontrada.');
    adminView(res, 'pagina-editar', {
      title: 'Editar pagina | Smart Folha Services',
      page
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar pagina.');
  }
}

async function updatePage(req, res) {
  try {
    await PageModel.update(req.params.id, {
      title: sanitize(req.body.title),
      meta_description: sanitize(req.body.meta_description),
      heading: sanitize(req.body.heading),
      content: sanitize(req.body.content),
      cta_text: sanitize(req.body.cta_text),
      active: req.body.active === '1'
    });
    res.redirect('/admin/paginas');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao salvar pagina.');
  }
}

async function simulacoes(req, res) {
  try {
    const calculatorType = sanitize(req.query.calculator_type);
    const simulations = (await SimulationModel.findAll(calculatorType)).map((simulation) => ({
      ...simulation,
      input_data: parseJson(simulation.input_data, {}),
      result_data: parseJson(simulation.result_data, {})
    }));
    adminView(res, 'simulacoes', {
      title: 'Simulacoes | Smart Folha Services',
      simulations,
      calculatorType
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar simulacoes.');
  }
}

async function configuracoes(req, res) {
  try {
    const settings = await SettingModel.allAsObject();
    adminView(res, 'configuracoes', {
      title: 'Configuracoes | Smart Folha Services',
      settings
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar configuracoes.');
  }
}

async function updateConfiguracoes(req, res) {
  try {
    await SettingModel.updateMany({
      whatsapp_main: sanitize(req.body.whatsapp_main),
      contact_email: sanitize(req.body.contact_email),
      company_name: sanitize(req.body.company_name),
      footer_text: sanitize(req.body.footer_text),
      instagram_url: sanitize(req.body.instagram_url),
      linkedin_url: sanitize(req.body.linkedin_url)
    });
    res.redirect('/admin/configuracoes');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao salvar configuracoes.');
  }
}

module.exports = {
  dashboard,
  leads,
  leadDetail,
  updateLeadStatus,
  formulas,
  editFormulaPage,
  newFormulaPage,
  createFormula,
  updateFormula,
  calculadorasAdmin,
  newCalculatorPage,
  createCalculator,
  editCalculatorPage,
  updateCalculator,
  newCalculatorFieldPage,
  createCalculatorField,
  editCalculatorFieldPage,
  updateCalculatorField,
  paginas,
  editPage,
  updatePage,
  simulacoes,
  configuracoes,
  updateConfiguracoes
};
