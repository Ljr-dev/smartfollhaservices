const LeadModel = require('../models/LeadModel');
const PageModel = require('../models/PageModel');
const ServiceModel = require('../models/ServiceModel');
const SettingModel = require('../models/SettingModel');
const CalculatorModel = require('../models/CalculatorModel');
const { sanitize, sanitizeOptional } = require('./helpers');

async function applySettings(res) {
  const settings = await SettingModel.allAsObject();
  res.locals.site = {
    companyName: settings.company_name || 'Smart Folha Services',
    whatsapp: settings.whatsapp_main || '5599999999999',
    email: settings.contact_email || 'contato@smartfolhaservices.com.br',
    instagram: settings.instagram_url || '',
    linkedin: settings.linkedin_url || '',
    footerText: settings.footer_text || 'Consultoria em folha de pagamento, Departamento Pessoal e eSocial.'
  };
}

function professionalSchema(req) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Smart Folha Services',
    url: `${req.protocol}://${req.get('host')}`,
    areaServed: 'Brasil',
    serviceType: 'Consultoria em folha de pagamento, Departamento Pessoal e eSocial'
  });
}

async function renderPublic(req, res, view, slug, defaults = {}) {
  await applySettings(res);
  const [page, calculators] = await Promise.all([
    PageModel.findBySlug(slug),
    CalculatorModel.findActive().catch(() => [])
  ]);
  res.render(view, {
    title: page?.title || defaults.title,
    metaDescription: page?.meta_description || defaults.metaDescription,
    page,
    calculators,
    schema: professionalSchema(req),
    ...defaults
  });
}

async function home(req, res) {
  try {
    await applySettings(res);
    const page = await PageModel.findBySlug('inicio');
    const services = await ServiceModel.findActive();
    res.render('index', {
      title: page?.title || 'Smart Folha Services | Folha de pagamento sem complicacao',
      metaDescription: page?.meta_description || 'Apoio especializado em folha de pagamento, eSocial, rescisões e férias.',
      page,
      services,
      schema: professionalSchema(req)
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar pagina inicial.');
  }
}

async function servicos(req, res) {
  try {
    const services = await ServiceModel.findActive();
    await renderPublic(req, res, 'servicos', 'servicos', {
      title: 'Servicos de folha de pagamento e Departamento Pessoal | Smart Folha Services',
      metaDescription: 'BPO de folha, consultoria em DP, eSocial, auditoria, férias, rescisões e treinamento no Sistema Dominio.',
      services
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar servicos.');
  }
}

async function calculatorPage(req, res, slug, title, description) {
  try {
    await applySettings(res);
    const [calculator, calculators, page] = await Promise.all([
      CalculatorModel.findBySlug(slug).catch(() => null),
      CalculatorModel.findActive().catch(() => []),
      PageModel.findBySlug(`calculadora-${slug}`)
    ]);

    if (!calculator || !calculator.active) {
      return res.status(404).send('Calculadora nao encontrada.');
    }

    const fields = await CalculatorModel.fields(calculator.id, true);
    res.render('calculadora-dinamica', {
      title: page?.title || title || `${calculator.title} | Smart Folha Services`,
      metaDescription: page?.meta_description || description || calculator.description,
      page,
      calculators,
      calculator,
      fields,
      schema: professionalSchema(req)
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar calculadora.');
  }
}

async function calculadoras(req, res) {
  try {
    await renderPublic(req, res, 'calculadoras', 'calculadoras', {
      title: 'Calculadoras trabalhistas | Smart Folha Services',
      metaDescription: 'Escolha entre calculadoras de rescisao, ferias, 13o salario, hora extra e FGTS.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar calculadoras.');
  }
}

async function contato(req, res) {
  try {
    await renderPublic(req, res, 'contato', 'contato', {
      title: 'Contato | Smart Folha Services',
      metaDescription: 'Fale com a Smart Folha Services para consultoria em folha de pagamento e Departamento Pessoal.',
      success: req.query.success === '1',
      error: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar contato.');
  }
}

async function sendContact(req, res) {
  try {
    const name = sanitize(req.body.name);
    const email = sanitize(req.body.email);
    const phone = sanitize(req.body.phone);
    const message = sanitize(req.body.message);

    if (!name || !email || !phone || !message) {
      await applySettings(res);
      return res.status(400).render('contato', {
        title: 'Contato | Smart Folha Services',
        metaDescription: 'Fale com a Smart Folha Services.',
        page: null,
        schema: professionalSchema(req),
        success: false,
        error: 'Preencha nome, e-mail, telefone e mensagem.'
      });
    }

    await LeadModel.create({
      name,
      email,
      phone,
      company: sanitizeOptional(req.body.company),
      service_interest: sanitizeOptional(req.body.service_interest),
      message,
      source_page: sanitizeOptional(req.body.source_page) || 'contato'
    });

    return res.redirect('/contato?success=1');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Erro ao enviar contato.');
  }
}

function robots(req, res) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`);
}

function sitemap(req, res) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const urls = [
    '/',
    '/servicos',
    '/calculadoras',
    '/calculadora-rescisao',
    '/calculadora-ferias',
    '/calculadora-decimo-terceiro',
    '/calculadora-hora-extra',
    '/calculadora-fgts',
    '/contato'
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${baseUrl}${url}</loc></url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
}

module.exports = {
  home,
  servicos,
  calculadoras,
  contato,
  sendContact,
  robots,
  sitemap,
  dynamicCalculator: (req, res) => calculatorPage(req, res, req.params.slug),
  calculadoraRescisao: (req, res) => calculatorPage(req, res, 'rescisao', 'Calculadora de rescisao trabalhista | Smart Folha Services', 'Simule saldo de salario, ferias, 13o, aviso previo e multa FGTS.'),
  calculadoraFerias: (req, res) => calculatorPage(req, res, 'ferias', 'Calculadora de ferias trabalhistas | Smart Folha Services', 'Simule ferias, 1/3 constitucional e total bruto estimado.'),
  calculadoraDecimoTerceiro: (req, res) => calculatorPage(req, res, 'decimo-terceiro', 'Calculadora de 13o salario proporcional | Smart Folha Services', 'Simule o 13o salario proporcional e parcelas estimadas.'),
  calculadoraHoraExtra: (req, res) => calculatorPage(req, res, 'hora-extra', 'Calculadora de hora extra | Smart Folha Services', 'Simule valor de hora normal, hora extra e total de adicionais.'),
  calculadoraFgts: (req, res) => calculatorPage(req, res, 'fgts', 'Calculadora de FGTS | Smart Folha Services', 'Simule deposito mensal, saldo estimado de FGTS e multa de 40%.')
};
