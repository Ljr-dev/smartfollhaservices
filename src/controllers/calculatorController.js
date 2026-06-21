const SimulationModel = require('../models/SimulationModel');
const FormulaModel = require('../models/FormulaModel');
const CalculatorModel = require('../models/CalculatorModel');
const { sanitize, sanitizeOptional, toNumber, formatCurrency } = require('./helpers');

const CONFIG_2026 = {
  salarioMinimo: 1621.00,
  inss: [
    { ate: 1621.00, aliquota: 0.075 },
    { ate: 2902.84, aliquota: 0.09 },
    { ate: 4354.27, aliquota: 0.12 },
    { ate: 8475.55, aliquota: 0.14 }
  ],
  irrf: [
    { ate: 2428.80, aliquota: 0, deducao: 0 },
    { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
    { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
    { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
    { ate: Infinity, aliquota: 0.275, deducao: 908.73 }
  ],
  deducaoDependenteIrrf: 189.59,
  descontoSimplificadoIrrf: 607.20,
  fgts: 0.08,
  valeTransportePercentual: 0.06
};

function money(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function monthsBetween(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || end < start) return 0;

  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();

  if (end.getDate() >= 15) months += 1;

  return Math.max(months, 0);
}

function completedYearsBetween(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || end < start) return 0;

  let years = end.getFullYear() - start.getFullYear();
  const anniversary = new Date(end.getFullYear(), start.getMonth(), start.getDate());

  if (end < anniversary) years -= 1;

  return Math.max(years, 0);
}

function calculateInss(base) {
  let remaining = Math.min(toNumber(base), CONFIG_2026.inss.at(-1).ate);
  let previousLimit = 0;
  let total = 0;
  const faixas = [];

  for (const faixa of CONFIG_2026.inss) {
    if (remaining <= 0) break;

    const faixaBase = Math.min(remaining, faixa.ate - previousLimit);
    const valor = faixaBase * faixa.aliquota;

    faixas.push({
      base: money(faixaBase),
      aliquota: faixa.aliquota * 100,
      valor: money(valor)
    });

    total += valor;
    remaining -= faixaBase;
    previousLimit = faixa.ate;
  }

  return {
    base_inss: money(base),
    desconto_inss: money(total),
    faixas
  };
}

function calculateIrrf(baseBruta, dependentes = 0, pensaoAlimenticia = 0) {
  const inss = calculateInss(baseBruta).desconto_inss;

  const baseLegal = Math.max(
    0,
    toNumber(baseBruta) -
      inss -
      toNumber(pensaoAlimenticia) -
      toNumber(dependentes) * CONFIG_2026.deducaoDependenteIrrf
  );

  const baseSimplificada = Math.max(
    0,
    toNumber(baseBruta) - CONFIG_2026.descontoSimplificadoIrrf
  );

  const usarSimplificado = baseSimplificada < baseLegal;
  const baseCalculo = usarSimplificado ? baseSimplificada : baseLegal;

  const faixa = CONFIG_2026.irrf.find(item => baseCalculo <= item.ate);
  const impostoNormal = Math.max(0, baseCalculo * faixa.aliquota - faixa.deducao);

  let reducao2026 = 0;
  const rendimentoMensal = toNumber(baseBruta);

  if (rendimentoMensal <= 5000) {
    reducao2026 = Math.min(impostoNormal, 312.89);
  } else if (rendimentoMensal <= 7350) {
    reducao2026 = Math.max(0, 978.62 - 0.133145 * rendimentoMensal);
    reducao2026 = Math.min(reducao2026, impostoNormal);
  }

  const impostoFinal = Math.max(0, impostoNormal - reducao2026);

  return {
    base_irrf_bruta: money(baseBruta),
    desconto_inss_usado: money(inss),
    dependentes: toNumber(dependentes),
    pensao_alimenticia: money(pensaoAlimenticia),
    deducao_dependentes: money(toNumber(dependentes) * CONFIG_2026.deducaoDependenteIrrf),
    deducao_simplificada_usada: usarSimplificado,
    base_calculo_irrf: money(baseCalculo),
    aliquota_irrf: faixa.aliquota * 100,
    deducao_irrf: money(faixa.deducao),
    irrf_antes_reducao_2026: money(impostoNormal),
    reducao_irrf_2026: money(reducao2026),
    desconto_irrf: money(impostoFinal)
  };
}

function calculateFolhaMensal(input) {
  const salario = toNumber(input.salario_bruto);
  const adicionais = toNumber(input.adicionais);
  const horasExtras = toNumber(input.horas_extras_valor);
  const faltas = toNumber(input.faltas_valor);
  const dsrDesconto = toNumber(input.dsr_desconto);
  const dependentes = toNumber(input.dependentes);
  const pensao = toNumber(input.pensao_alimenticia);
  const valeTransporte = input.descontar_vale_transporte ? salario * CONFIG_2026.valeTransportePercentual : 0;
  const outrosDescontos = toNumber(input.outros_descontos);

  const bruto = salario + adicionais + horasExtras;
  const descontosAntesImpostos = faltas + dsrDesconto;

  const baseInss = Math.max(0, bruto - descontosAntesImpostos);
  const inss = calculateInss(baseInss);
  const irrf = calculateIrrf(baseInss, dependentes, pensao);

  const fgts = baseInss * CONFIG_2026.fgts;
  const totalDescontos = descontosAntesImpostos + inss.desconto_inss + irrf.desconto_irrf + valeTransporte + pensao + outrosDescontos;
  const liquido = bruto - totalDescontos;

  return {
    salario_base: money(salario),
    total_proventos: money(bruto),
    base_inss: money(baseInss),
    desconto_inss: inss.desconto_inss,
    base_irrf: irrf.base_calculo_irrf,
    desconto_irrf: irrf.desconto_irrf,
    fgts_mes: money(fgts),
    vale_transporte: money(valeTransporte),
    outros_descontos: money(outrosDescontos),
    total_descontos: money(totalDescontos),
    salario_liquido: money(liquido),
    salario_liquido_formatado: formatCurrency(liquido),
    detalhes_inss: inss,
    detalhes_irrf: irrf
  };
}

function calculateFerias(input) {
  const salario = toNumber(input.salario_bruto);
  const medias = toNumber(input.media_adicionais);
  const diasFerias = Math.min(toNumber(input.dias_ferias) || 30, 30);
  const abonoDias = Math.min(toNumber(input.dias_abono_pecuniario), 10);
  const dependentes = toNumber(input.dependentes);

  const base = salario + medias;
  const ferias = (base / 30) * diasFerias;
  const umTerco = ferias / 3;

  const abono = (base / 30) * abonoDias;
  const umTercoAbono = abono / 3;

  const brutoTributavel = ferias + umTerco;
  const brutoNaoTributavel = abono + umTercoAbono;

  const inss = calculateInss(brutoTributavel);
  const irrf = calculateIrrf(brutoTributavel, dependentes);

  const liquido = brutoTributavel + brutoNaoTributavel - inss.desconto_inss - irrf.desconto_irrf;

  return {
    valor_ferias: money(ferias),
    um_terco_constitucional: money(umTerco),
    abono_pecuniario: money(abono),
    um_terco_abono: money(umTercoAbono),
    total_bruto: money(brutoTributavel + brutoNaoTributavel),
    desconto_inss: inss.desconto_inss,
    desconto_irrf: irrf.desconto_irrf,
    total_liquido: money(liquido),
    total_formatado: formatCurrency(liquido)
  };
}

function calculateDecimoTerceiro(input) {
  const salario = toNumber(input.salario_bruto);
  const medias = toNumber(input.media_adicionais);
  const meses = Math.min(toNumber(input.meses_trabalhados), 12);
  const dependentes = toNumber(input.dependentes);

  const total = ((salario + medias) / 12) * meses;
  const primeiraParcela = total / 2;

  const inss = calculateInss(total);
  const irrf = calculateIrrf(total, dependentes);
  const segundaParcela = total - primeiraParcela - inss.desconto_inss - irrf.desconto_irrf;

  return {
    valor_total_13: money(total),
    primeira_parcela: money(primeiraParcela),
    desconto_inss_segunda_parcela: inss.desconto_inss,
    desconto_irrf_segunda_parcela: irrf.desconto_irrf,
    segunda_parcela_liquida: money(segundaParcela),
    total_formatado: formatCurrency(total)
  };
}

function calculateHoraExtra(input) {
  const salario = toNumber(input.salario_mensal);
  const carga = toNumber(input.carga_horaria_mensal) || 220;
  const horas = toNumber(input.quantidade_horas);
  const percentual = toNumber(input.percentual_adicional) || 50;
  const diasUteis = toNumber(input.dias_uteis) || 26;
  const domingosFeriados = toNumber(input.domingos_feriados) || 4;

  const horaNormal = salario / carga;
  const valorHoraExtra = horaNormal * (1 + percentual / 100);
  const totalHorasExtras = valorHoraExtra * horas;
  const dsr = diasUteis > 0 ? (totalHorasExtras / diasUteis) * domingosFeriados : 0;
  const totalComDsr = totalHorasExtras + dsr;

  return {
    valor_hora_normal: money(horaNormal),
    valor_hora_extra: money(valorHoraExtra),
    total_horas_extras: money(totalHorasExtras),
    dsr_sobre_horas_extras: money(dsr),
    total_com_dsr: money(totalComDsr),
    total_formatado: formatCurrency(totalComDsr)
  };
}

function calculateFgts(input) {
  const salario = toNumber(input.salario_bruto);
  const adicionais = toNumber(input.adicionais);
  const meses = toNumber(input.meses_trabalhados);
  const depositado = toNumber(input.valor_depositado);

  const base = salario + adicionais;
  const depositoMensal = base * CONFIG_2026.fgts;
  const totalEstimado = depositoMensal * meses;
  const saldoBase = depositado > 0 ? depositado : totalEstimado;
  const multa40 = saldoBase * 0.4;
  const multa20 = saldoBase * 0.2;

  return {
    base_fgts: money(base),
    deposito_mensal_estimado: money(depositoMensal),
    total_estimado_fgts: money(totalEstimado),
    multa_40_estimada: money(multa40),
    multa_20_acordo_estimada: money(multa20),
    total_formatado: formatCurrency(totalEstimado)
  };
}

function calculateRescisao(input) {
  const salario = toNumber(input.salario_bruto);
  const medias = toNumber(input.media_adicionais);
  const admissao = sanitize(input.data_admissao);
  const demissao = sanitize(input.data_demissao);
  const tipo = sanitize(input.tipo_rescisao);

  const mesesContrato = monthsBetween(admissao, demissao);
  const anosContrato = completedYearsBetween(admissao, demissao);
  const dataDemissao = parseDate(demissao);

  const diasSaldo = dataDemissao ? dataDemissao.getDate() : 0;
  const saldoSalario = (salario / 30) * diasSaldo;

  const justaCausa = tipo === 'Justa causa';
  const pedidoDemissao = tipo === 'Pedido de demissão';
  const dispensaSemJusta = tipo === 'Dispensa sem justa causa';
  const acordo = tipo === 'Acordo';

  const avos13 = Math.min(mesesBetween(`${dataDemissao?.getFullYear()}-01-01`, demissao), 12);
  const decimoTerceiro = justaCausa ? 0 : ((salario + medias) / 12) * avos13;

  const avosFerias = Math.min(mesesContrato % 12 || 12, 12);
  const feriasProporcionais = justaCausa ? 0 : ((salario + medias) / 12) * avosFerias;
  const umTercoFeriasProp = feriasProporcionais / 3;

  const temFeriasVencidas = input.tem_ferias_vencidas === true || input.tem_ferias_vencidas === 'true';
  const feriasVencidas = !justaCausa && temFeriasVencidas ? salario + medias : 0;
  const umTercoFeriasVencidas = feriasVencidas / 3;

  const diasAviso = dispensaSemJusta || acordo
    ? Math.min(30 + Math.max(anosContrato - 1, 0) * 3, 90)
    : 0;

  const avisoPrevio = dispensaSemJusta ? (salario / 30) * diasAviso : acordo ? ((salario / 30) * diasAviso) / 2 : 0;

  const fgtsInformado = toNumber(input.saldo_fgts);
  const fgtsEstimado = (salario + medias) * Math.max(mesesContrato, 1) * CONFIG_2026.fgts;
  const baseMultaFgts = fgtsInformado > 0 ? fgtsInformado : fgtsEstimado;

  const multaFgts = dispensaSemJusta
    ? baseMultaFgts * 0.4
    : acordo
      ? baseMultaFgts * 0.2
      : 0;

  const descontoAvisoPedido = pedidoDemissao && input.descontar_aviso_previo === true
    ? salario
    : 0;

  const proventos =
    saldoSalario +
    decimoTerceiro +
    feriasProporcionais +
    umTercoFeriasProp +
    feriasVencidas +
    umTercoFeriasVencidas +
    avisoPrevio +
    multaFgts;

  const descontos = descontoAvisoPedido;
  const total = proventos - descontos;

  return {
    meses_contrato: mesesContrato,
    anos_contrato: anosContrato,
    dias_saldo_salario: diasSaldo,
    saldo_salario: money(saldoSalario),
    decimo_terceiro_proporcional: money(decimoTerceiro),
    ferias_vencidas: money(feriasVencidas),
    um_terco_ferias_vencidas: money(umTercoFeriasVencidas),
    ferias_proporcionais: money(feriasProporcionais),
    um_terco_ferias_proporcionais: money(umTercoFeriasProp),
    dias_aviso_previo: diasAviso,
    aviso_previo: money(avisoPrevio),
    fgts_base_estimado_ou_informado: money(baseMultaFgts),
    multa_fgts: money(multaFgts),
    desconto_aviso_previo_pedido: money(descontoAvisoPedido),
    total_proventos: money(proventos),
    total_descontos: money(descontos),
    total_estimado: money(total),
    total_formatado: formatCurrency(total)
  };
}

function normalizeExpression(expression) {
  return String(expression || '')
    .replace(/(\d+(?:[.,]\d+)?)\s*%/g, (_, value) => String(toNumber(value) / 100))
    .replace(/\bMath\./g, '');
}

function assertSafeExpression(expression, allowedNames) {
  const normalized = normalizeExpression(expression);
  if (!/^[\w\s+\-*/().,<>=!?:&|%'"[\]]+$/.test(normalized)) {
    throw new Error('Formula contem caracteres nao permitidos.');
  }

  const reserved = new Set(['Math', 'min', 'max', 'round', 'floor', 'ceil', 'abs', 'true', 'false']);
  const expressionWithoutStrings = normalized.replace(/(["']).*?\1/g, '');
  const identifiers = expressionWithoutStrings.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
  identifiers.forEach((name) => {
    if (!allowedNames.has(name) && !reserved.has(name)) {
      throw new Error(`Variavel nao permitida na formula: ${name}`);
    }
  });

  return normalized;
}

function evaluateFormula(expression, context) {
  const allowedNames = new Set(Object.keys(context));
  const safeExpression = assertSafeExpression(expression, allowedNames);
  const names = Object.keys(context);
  const values = names.map((name) => context[name]);
  const evaluator = new Function(
    ...names,
    'min',
    'max',
    'round',
    'floor',
    'ceil',
    'abs',
    `"use strict"; return (${safeExpression});`
  );
  return evaluator(...values, Math.min, Math.max, Math.round, Math.floor, Math.ceil, Math.abs);
}

function buildDynamicContext(fields, input) {
  const context = fields.reduce((fieldContext, field) => {
    if (field.input_type === 'checkbox') {
      fieldContext[field.field_name] = input[field.field_name] === true || input[field.field_name] === 'true' || input[field.field_name] === '1' ? 1 : 0;
      return fieldContext;
    }

    if (field.input_type === 'date' || field.input_type === 'select' || field.input_type === 'text') {
      fieldContext[field.field_name] = sanitize(input[field.field_name]);
      return fieldContext;
    }

    fieldContext[field.field_name] = toNumber(input[field.field_name] || field.default_value);
    return fieldContext;
  }, {});

  if (context.data_admissao && context.data_demissao) {
    context.meses_contrato = monthsBetween(context.data_admissao, context.data_demissao);
    context.anos_contrato = completedYearsBetween(context.data_admissao, context.data_demissao);
    const dataDemissao = parseDate(context.data_demissao);
    context.dias_saldo_salario = dataDemissao ? dataDemissao.getDate() : 0;
    context.avos_13 = dataDemissao ? Math.min(monthsBetween(`${dataDemissao.getFullYear()}-01-01`, context.data_demissao), 12) : 0;
    context.avos_ferias = Math.min(context.meses_contrato % 12 || 12, 12);
    context.dias_aviso_previo_legal = Math.min(30 + Math.max(context.anos_contrato - 1, 0) * 3, 90);
  }

  return context;
}

async function calculateDynamic(type, input) {
  const calculator = await CalculatorModel.findByType(type);
  if (!calculator || !calculator.active) return null;

  const [fields, formulas] = await Promise.all([
    CalculatorModel.fields(calculator.id, true),
    FormulaModel.findActiveByCalculator(type)
  ]);

  if (!formulas.length) return null;

  const context = buildDynamicContext(fields, input);
  const result = {};
  const pending = [...formulas];

  while (pending.length) {
    let resolved = false;

    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const formula = pending[index];
      try {
        const value = evaluateFormula(formula.formula_expression, { ...context, ...result });
        result[formula.field_name] = money(value);
        pending.splice(index, 1);
        resolved = true;
      } catch (error) {
        if (!String(error.message || '').includes('Variavel nao permitida')) {
          throw error;
        }
      }
    }

    if (!resolved) {
      throw new Error(`Nao foi possivel resolver formulas: ${pending.map((formula) => formula.field_name).join(', ')}`);
    }
  }

  const totalKey = [
    'total_estimado',
    'total_bruto',
    'total_com_dsr',
    'total_estimado_fgts',
    'valor_total_13'
  ].find((key) => typeof result[key] === 'number');
  const totalValue = totalKey ? result[totalKey] : Object.values(result).find((value) => typeof value === 'number');
  if (totalValue !== undefined) {
    result.total_formatado = formatCurrency(totalValue);
  }

  return result;
}

function respondCalculation(type, calculator) {
  return async (req, res) => {
    try {
      const dynamicResult = await calculateDynamic(type, req.body);
      const result = dynamicResult || calculator(req.body);
      return res.json({
        ok: true,
        calculator_type: type,
        result,
        aviso: 'Cálculo estimativo. Valide CCT, rubricas, afastamentos, médias, incidências e regras internas antes de uso comercial.'
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        ok: false,
        message: 'Erro ao calcular.'
      });
    }
  };
}

async function calcularDinamico(req, res) {
  try {
    const type = sanitize(req.params.calculator_type);
    const result = await calculateDynamic(type, req.body);

    if (!result) {
      return res.status(404).json({
        ok: false,
        message: 'Calculadora nao encontrada ou sem formulas ativas.'
      });
    }

    return res.json({
      ok: true,
      calculator_type: type,
      result,
      aviso: 'Calculo estimativo. Valide CCT, rubricas, afastamentos, medias, incidencias e regras internas antes de uso comercial.'
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      ok: false,
      message: error.message || 'Erro ao calcular.'
    });
  }
}

async function saveSimulation(req, res) {
  try {
    const calculatorType = sanitize(req.body.calculator_type);

    if (!calculatorType) {
      return res.status(400).json({
        ok: false,
        message: 'Tipo de calculadora obrigatório.'
      });
    }

    const id = await SimulationModel.create({
      calculator_type: calculatorType,
      user_name: sanitizeOptional(req.body.user_name),
      user_email: sanitizeOptional(req.body.user_email),
      user_phone: sanitizeOptional(req.body.user_phone),
      input_data: req.body.input_data || {},
      result_data: req.body.result_data || {}
    });

    return res.json({ ok: true, id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: 'Erro ao salvar simulação.'
    });
  }
}

module.exports = {
  calculateInss,
  calculateIrrf,
  calculateFolhaMensal,
  calculateRescisao,
  calculateFerias,
  calculateDecimoTerceiro,
  calculateHoraExtra,
  calculateFgts,

  calcularFolhaMensal: respondCalculation('folha-mensal', calculateFolhaMensal),
  calcularRescisao: respondCalculation('rescisao', calculateRescisao),
  calcularFerias: respondCalculation('ferias', calculateFerias),
  calcularDecimoTerceiro: respondCalculation('decimo-terceiro', calculateDecimoTerceiro),
  calcularHoraExtra: respondCalculation('hora-extra', calculateHoraExtra),
  calcularFgts: respondCalculation('fgts', calculateFgts),
  calcularDinamico,

  saveSimulation
};
