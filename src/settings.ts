"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import Card = formattingSettings.SimpleCard;
import Model = formattingSettings.Model;
import ValidatorType = powerbi.visuals.ValidatorType;

const FONTE_PADRAO = "Segoe UI, sans-serif";

const TIPOS_FORMATO: powerbi.IEnumMember[] = [
    { value: "auto", displayName: "Automatico" },
    { value: "decimal", displayName: "Decimal" },
    { value: "inteiro", displayName: "Inteiro" },
    { value: "percentualFracao", displayName: "Percentual (fracao 0-1)" },
    { value: "percentual", displayName: "Percentual (ja em %)" },
    { value: "moedaBRL", displayName: "Moeda (R$)" },
    { value: "moedaUSD", displayName: "Moeda (US$)" },
    { value: "moedaEUR", displayName: "Moeda (EUR)" }
];

const ORDENS_FATIAS: powerbi.IEnumMember[] = [
    { value: "dados", displayName: "Ordem dos dados" },
    { value: "valorDesc", displayName: "Maior valor primeiro" },
    { value: "valorAsc", displayName: "Menor valor primeiro" },
    { value: "nomeAsc", displayName: "Nome A para Z" },
    { value: "nomeDesc", displayName: "Nome Z para A" }
];

const CONTEUDO_ROTULO: powerbi.IEnumMember[] = [
    { value: "valor", displayName: "Apenas valor" },
    { value: "percentual", displayName: "Apenas percentual" },
    { value: "categoria", displayName: "Apenas categoria" },
    { value: "valorPercentual", displayName: "Valor + percentual" },
    { value: "categoriaValor", displayName: "Categoria + valor" },
    { value: "categoriaPercentual", displayName: "Categoria + percentual" },
    { value: "categoriaValorPercentual", displayName: "Categoria + valor + percentual" }
];

const LOCACOES_ROTULO: powerbi.IEnumMember[] = [
    { value: "interno", displayName: "Interno (dentro da fatia)" },
    { value: "externo", displayName: "Externo (fora da fatia)" },
    { value: "linhaGuia", displayName: "Externo com linha guia" }
];

const ALINHAMENTOS_ROTULO: powerbi.IEnumMember[] = [
    { value: "centro", displayName: "Centro da fatia" },
    { value: "borda", displayName: "Borda da fatia" }
];

const POSICOES_LEGENDA: powerbi.IEnumMember[] = [
    { value: "topo", displayName: "Topo" },
    { value: "base", displayName: "Base" },
    { value: "esquerda", displayName: "Esquerda" },
    { value: "direita", displayName: "Direita" }
];

const ALINHAMENTOS_LEGENDA: powerbi.IEnumMember[] = [
    { value: "inicio", displayName: "Inicio" },
    { value: "centro", displayName: "Centro" },
    { value: "fim", displayName: "Fim" }
];

const FORMAS_MARCADOR: powerbi.IEnumMember[] = [
    { value: "quadrado", displayName: "Quadrado" },
    { value: "circulo", displayName: "Circulo" },
    { value: "linha", displayName: "Linha" }
];

function numero(name: string, displayName: string, valor: number, min: number, max: number): formattingSettings.NumUpDown {
    return new formattingSettings.NumUpDown({
        name,
        displayName,
        value: valor,
        options: {
            minValue: { type: ValidatorType.Min, value: min },
            maxValue: { type: ValidatorType.Max, value: max }
        }
    });
}

function cor(name: string, displayName: string, hex: string): formattingSettings.ColorPicker {
    return new formattingSettings.ColorPicker({
        name,
        displayName,
        value: { value: hex }
    });
}

function toggle(name: string, displayName: string, valor: boolean): formattingSettings.ToggleSwitch {
    return new formattingSettings.ToggleSwitch({ name, displayName, value: valor });
}

function texto(name: string, displayName: string, valor: string, placeholder?: string): formattingSettings.TextInput {
    return new formattingSettings.TextInput({
        name,
        displayName,
        value: valor,
        placeholder: placeholder || ""
    });
}

function dropdown(name: string, displayName: string, items: powerbi.IEnumMember[], indexPadrao: number): formattingSettings.ItemDropdown {
    return new formattingSettings.ItemDropdown({
        name,
        displayName,
        items,
        value: items[indexPadrao]
    });
}

/* =========================== Rosca =========================== */
class RoscaCard extends Card {
    raioExterno = numero("raioExterno", "Raio externo (% do menor lado)", 90, 30, 100);
    larguraAnel = numero("larguraAnel", "Largura do anel (% do raio externo)", 45, 5, 100);
    rotacaoInicial = numero("rotacaoInicial", "Rotacao inicial (graus)", 0, -360, 360);
    espacoFatias = numero("espacoFatias", "Espaco entre fatias (px)", 1, 0, 20);
    raioCanto = numero("raioCanto", "Arredondamento dos cantos (px)", 0, 0, 30);
    ordemFatias = dropdown("ordemFatias", "Ordem das fatias", ORDENS_FATIAS, 0);
    exibirBorda = toggle("exibirBorda", "Exibir borda nas fatias", false);
    corBorda = cor("corBorda", "Cor da borda", "#FFFFFF");
    espessuraBorda = numero("espessuraBorda", "Espessura da borda (px)", 1, 0, 10);
    name = "rosca";
    displayName = "Rosca";
    slices = [
        this.raioExterno, this.larguraAnel, this.rotacaoInicial,
        this.espacoFatias, this.raioCanto, this.ordemFatias,
        this.exibirBorda, this.corBorda, this.espessuraBorda
    ];
}

/* =========================== Cores das fatias =========================== */
class CoresCard extends Card {
    cor1 = cor("cor1", "Cor da 1a fatia", "#3B82F6");
    cor2 = cor("cor2", "Cor da 2a fatia", "#10B981");
    cor3 = cor("cor3", "Cor da 3a fatia", "#F59E0B");
    cor4 = cor("cor4", "Cor da 4a fatia", "#EF4444");
    cor5 = cor("cor5", "Cor da 5a fatia", "#8B5CF6");
    cor6 = cor("cor6", "Cor da 6a fatia", "#EC4899");
    cor7 = cor("cor7", "Cor da 7a fatia", "#14B8A6");
    cor8 = cor("cor8", "Cor da 8a fatia", "#F97316");
    cor9 = cor("cor9", "Cor da 9a fatia", "#0EA5E9");
    cor10 = cor("cor10", "Cor da 10a fatia", "#A855F7");
    cor11 = cor("cor11", "Cor da 11a fatia", "#84CC16");
    cor12 = cor("cor12", "Cor da 12a fatia", "#6B7280");
    name = "cores";
    displayName = "Cores das fatias";
    slices = [this.cor1, this.cor2, this.cor3, this.cor4, this.cor5, this.cor6, this.cor7, this.cor8, this.cor9, this.cor10, this.cor11, this.cor12];
}

/* =========================== Totalizador central =========================== */
class CentroCard extends Card {
    exibir = toggle("exibir", "Exibir totalizador central", true);
    exibirTitulo = toggle("exibirTitulo", "Exibir titulo", true);
    tituloTexto = texto("tituloTexto", "Texto do titulo", "Total", "ex.: Total geral");
    tituloFontFamily = new formattingSettings.FontPicker({ name: "tituloFontFamily", value: FONTE_PADRAO });
    tituloFontSize = numero("tituloFontSize", "Tamanho do titulo", 11, 6, 60);
    tituloFontBold = toggle("tituloFontBold", "Negrito (titulo)", false);
    tituloFontItalic = toggle("tituloFontItalic", "Italico (titulo)", false);
    tituloFontUnderline = toggle("tituloFontUnderline", "Sublinhado (titulo)", false);
    tituloCor = cor("tituloCor", "Cor do titulo", "#6B7280");

    valorFontFamily = new formattingSettings.FontPicker({ name: "valorFontFamily", value: FONTE_PADRAO });
    valorFontSize = numero("valorFontSize", "Tamanho do valor", 22, 8, 96);
    valorFontBold = toggle("valorFontBold", "Negrito (valor)", true);
    valorFontItalic = toggle("valorFontItalic", "Italico (valor)", false);
    valorFontUnderline = toggle("valorFontUnderline", "Sublinhado (valor)", false);
    valorCor = cor("valorCor", "Cor do valor", "#111827");
    valorTipoFormato = dropdown("valorTipoFormato", "Tipo de formato do valor", TIPOS_FORMATO, 0);
    valorCasasDecimais = numero("valorCasasDecimais", "Casas decimais", 0, 0, 6);
    valorAbreviar = toggle("valorAbreviar", "Abreviar (mil/mi/bi)", true);
    valorLimiarAbreviar = numero("valorLimiarAbreviar", "Limiar para abreviar", 1000, 100, 1_000_000);
    valorPrefixo = texto("valorPrefixo", "Prefixo do valor", "", "ex.: R$ ");
    valorSufixo = texto("valorSufixo", "Sufixo do valor", "", "ex.: un");
    espacoTituloValor = numero("espacoTituloValor", "Espaco entre titulo e valor (px)", 4, 0, 40);

    name = "centro";
    displayName = "Totalizador central";
    slices = [
        this.exibir,
        this.exibirTitulo, this.tituloTexto,
        this.tituloFontFamily, this.tituloFontSize, this.tituloFontBold, this.tituloFontItalic, this.tituloFontUnderline, this.tituloCor,
        this.valorFontFamily, this.valorFontSize, this.valorFontBold, this.valorFontItalic, this.valorFontUnderline, this.valorCor,
        this.valorTipoFormato, this.valorCasasDecimais, this.valorAbreviar, this.valorLimiarAbreviar, this.valorPrefixo, this.valorSufixo,
        this.espacoTituloValor
    ];
}

/* =========================== Rotulos das fatias =========================== */
class RotulosCard extends Card {
    exibir = toggle("exibir", "Exibir rotulos", true);
    conteudo = dropdown("conteudo", "Conteudo do rotulo", CONTEUDO_ROTULO, 3);
    separador = texto("separador", "Separador entre partes", " · ", "ex.: ' · ' ou ' / '");
    locacao = dropdown("locacao", "Locacao", LOCACOES_ROTULO, 0);
    alinhamento = dropdown("alinhamento", "Alinhamento (interno)", ALINHAMENTOS_ROTULO, 0);
    contrasteAuto = toggle("contrasteAuto", "Cor automatica (contraste interno)", true);
    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", value: FONTE_PADRAO });
    fontSize = numero("fontSize", "Tamanho", 10, 6, 60);
    fontBold = toggle("fontBold", "Negrito", false);
    fontItalic = toggle("fontItalic", "Italico", false);
    fontUnderline = toggle("fontUnderline", "Sublinhado", false);
    cor = cor("cor", "Cor (quando contraste auto desligado)", "#FFFFFF");
    tipoFormato = dropdown("tipoFormato", "Tipo de formato do valor", TIPOS_FORMATO, 0);
    casasDecimais = numero("casasDecimais", "Casas decimais (valor)", 0, 0, 6);
    casasPercentual = numero("casasPercentual", "Casas decimais (%)", 1, 0, 4);
    abreviar = toggle("abreviar", "Abreviar (mil/mi/bi)", false);
    limiarAbreviar = numero("limiarAbreviar", "Limiar para abreviar", 1000, 100, 1_000_000);
    prefixo = texto("prefixo", "Prefixo do valor", "", "ex.: R$ ");
    sufixo = texto("sufixo", "Sufixo do valor", "", "ex.: un");
    autoOcultar = toggle("autoOcultar", "Ocultar quando nao couber", true);
    distanciaExterna = numero("distanciaExterna", "Distancia externa (px)", 8, 0, 80);
    corLinhaGuia = cor("corLinhaGuia", "Cor da linha guia", "#9CA3AF");
    espessuraLinhaGuia = numero("espessuraLinhaGuia", "Espessura da linha guia (px)", 1, 0, 5);
    quebrarLinha = toggle("quebrarLinha", "Quebrar linha em rotulos longos", true);
    larguraMaxRotulo = numero("larguraMaxRotulo", "Largura maxima do rotulo (px)", 120, 30, 400);
    espacoEntreLinhas = numero("espacoEntreLinhas", "Espaco entre linhas (px)", 2, 0, 20);

    name = "rotulos";
    displayName = "Rotulos das fatias";
    slices = [
        this.exibir, this.conteudo, this.separador,
        this.locacao, this.alinhamento, this.contrasteAuto,
        this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.fontUnderline, this.cor,
        this.tipoFormato, this.casasDecimais, this.casasPercentual,
        this.abreviar, this.limiarAbreviar, this.prefixo, this.sufixo,
        this.autoOcultar, this.distanciaExterna,
        this.corLinhaGuia, this.espessuraLinhaGuia,
        this.quebrarLinha, this.larguraMaxRotulo, this.espacoEntreLinhas
    ];
}

/* =========================== Legenda =========================== */
class LegendaCard extends Card {
    exibir = toggle("exibir", "Exibir legenda", true);
    posicao = dropdown("posicao", "Posicao", POSICOES_LEGENDA, 3);
    alinhamento = dropdown("alinhamento", "Alinhamento", ALINHAMENTOS_LEGENDA, 1);
    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", value: FONTE_PADRAO });
    fontSize = numero("fontSize", "Tamanho", 11, 6, 60);
    fontBold = toggle("fontBold", "Negrito", false);
    fontItalic = toggle("fontItalic", "Italico", false);
    fontUnderline = toggle("fontUnderline", "Sublinhado", false);
    cor = cor("cor", "Cor do texto", "#374151");
    tamanhoMarcador = numero("tamanhoMarcador", "Tamanho do marcador (px)", 10, 4, 30);
    formaMarcador = dropdown("formaMarcador", "Forma do marcador", FORMAS_MARCADOR, 0);
    espacoItens = numero("espacoItens", "Espaco entre itens (px)", 12, 0, 60);
    opacidadeNaoSelecionado = numero("opacidadeNaoSelecionado", "Opacidade dos nao-selecionados (%)", 25, 0, 100);
    mostrarValor = toggle("mostrarValor", "Mostrar valor ao lado do nome", false);
    mostrarPercentual = toggle("mostrarPercentual", "Mostrar % ao lado do nome", false);
    name = "legenda";
    displayName = "Legenda";
    slices = [
        this.exibir, this.posicao, this.alinhamento,
        this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.fontUnderline, this.cor,
        this.tamanhoMarcador, this.formaMarcador, this.espacoItens, this.opacidadeNaoSelecionado,
        this.mostrarValor, this.mostrarPercentual
    ];
}

/* =========================== Tooltip =========================== */
class TooltipCard extends Card {
    exibir = toggle("exibir", "Exibir dicas de ferramenta", true);
    incluirCategoria = toggle("incluirCategoria", "Incluir categoria/fatia", true);
    incluirValor = toggle("incluirValor", "Incluir valor", true);
    incluirPercentual = toggle("incluirPercentual", "Incluir percentual", true);
    incluirTotal = toggle("incluirTotal", "Incluir total geral", false);
    name = "tooltip";
    displayName = "Dica de ferramenta";
    slices = [this.exibir, this.incluirCategoria, this.incluirValor, this.incluirPercentual, this.incluirTotal];
}

/* =========================== Modelo =========================== */
export class VisualFormattingSettingsModel extends Model {
    rosca = new RoscaCard();
    cores = new CoresCard();
    centro = new CentroCard();
    rotulos = new RotulosCard();
    legenda = new LegendaCard();
    tooltip = new TooltipCard();
    cards = [
        this.rosca,
        this.cores,
        this.centro,
        this.rotulos,
        this.legenda,
        this.tooltip
    ];
}
