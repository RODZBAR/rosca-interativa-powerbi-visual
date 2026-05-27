"use strict";

import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel } from "./settings";
import { formatarValor, formatarPercentual, ehNumeroValido, larguraTextoEstimada, OpcoesFormato, TipoFormato } from "./numberFormatter";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISelectionId = powerbi.visuals.ISelectionId;

interface FatiaDados {
    chave: string;
    nome: string;
    valor: number;
    cor: string;
    formato: string | undefined;
    indice: number;
    selectionId: ISelectionId | null;
    tooltips: { displayName: string; valor: any; formato?: string }[];
}

function numOuNull(v: any): number | null {
    if (!ehNumeroValido(v)) return null;
    return Number(v);
}

function lerCor(picker: any, fallback: string): string {
    if (!picker) return fallback;
    let v: any = picker.value;
    while (v && typeof v === "object" && "value" in v) v = v.value;
    if (typeof v === "string" && v.length > 0) return v;
    return fallback;
}

function lerEnum(picker: any, fallback: string): string {
    if (!picker || !picker.value) return fallback;
    const v: any = picker.value;
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && typeof v.value === "string") return v.value;
    return fallback;
}

function lerNumero(picker: any, fallback: number): number {
    if (!picker) return fallback;
    const n = Number(picker.value);
    return isFinite(n) ? n : fallback;
}

function lerBool(picker: any, fallback: boolean): boolean {
    if (!picker || picker.value === undefined || picker.value === null) return fallback;
    return !!picker.value;
}

function lerTexto(picker: any, fallback: string): string {
    if (!picker || picker.value === undefined || picker.value === null) return fallback;
    return String(picker.value);
}

function lerFonte(picker: any, fallback: string): string {
    if (!picker) return fallback;
    if (typeof picker.value === "string") return picker.value || fallback;
    return fallback;
}

function opcoesFormatoCentro(card: any): OpcoesFormato {
    return {
        tipo: lerEnum(card.valorTipoFormato, "auto") as TipoFormato,
        casasDecimais: lerNumero(card.valorCasasDecimais, 0),
        abreviar: lerBool(card.valorAbreviar, true),
        limiarAbreviar: lerNumero(card.valorLimiarAbreviar, 1000),
        prefixo: lerTexto(card.valorPrefixo, ""),
        sufixo: lerTexto(card.valorSufixo, "")
    };
}

function opcoesFormatoRotulo(card: any): OpcoesFormato {
    return {
        tipo: lerEnum(card.tipoFormato, "auto") as TipoFormato,
        casasDecimais: lerNumero(card.casasDecimais, 0),
        abreviar: lerBool(card.abreviar, false),
        limiarAbreviar: lerNumero(card.limiarAbreviar, 1000),
        prefixo: lerTexto(card.prefixo, ""),
        sufixo: lerTexto(card.sufixo, "")
    };
}

function corContraste(hex: string): string {
    if (!hex || hex.length < 4) return "#111827";
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length >= 7) {
        r = parseInt(hex.substr(1, 2), 16);
        g = parseInt(hex.substr(3, 2), 16);
        b = parseInt(hex.substr(5, 2), 16);
    }
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.55 ? "#111827" : "#FFFFFF";
}

function quebrarTextoEmLinhas(texto: string, larguraMax: number, family: string, size: number, bold: boolean): string[] {
    if (!texto) return [];
    if (larguraMax <= 0) return [texto];
    if (larguraTextoEstimada(texto, family, size, bold) <= larguraMax) return [texto];

    const palavras = texto.split(/\s+/).filter(p => p.length > 0);
    if (palavras.length === 0) return [texto];

    const linhas: string[] = [];
    let atual = "";
    for (const palavra of palavras) {
        const tentativa = atual ? atual + " " + palavra : palavra;
        if (larguraTextoEstimada(tentativa, family, size, bold) <= larguraMax) {
            atual = tentativa;
        } else {
            if (atual) {
                linhas.push(atual);
                atual = "";
            }
            // Se a palavra sozinha estoura, quebra por caractere
            if (larguraTextoEstimada(palavra, family, size, bold) > larguraMax) {
                let pedaco = "";
                for (const ch of palavra) {
                    const t = pedaco + ch;
                    if (larguraTextoEstimada(t, family, size, bold) <= larguraMax) {
                        pedaco = t;
                    } else {
                        if (pedaco) linhas.push(pedaco);
                        pedaco = ch;
                    }
                }
                atual = pedaco;
            } else {
                atual = palavra;
            }
        }
    }
    if (atual) linhas.push(atual);
    return linhas;
}

interface InfoRotulo {
    texto: string;
    linhas: string[];
    larguraTxt: number;
    alturaTxt: number;
}

function corDaFatia(cfg: VisualFormattingSettingsModel, indice: number): string {
    const defs = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#0EA5E9", "#A855F7", "#84CC16", "#6B7280"];
    const idx = indice % 12;
    const pickers: any[] = [
        cfg.cores.cor1, cfg.cores.cor2, cfg.cores.cor3, cfg.cores.cor4,
        cfg.cores.cor5, cfg.cores.cor6, cfg.cores.cor7, cfg.cores.cor8,
        cfg.cores.cor9, cfg.cores.cor10, cfg.cores.cor11, cfg.cores.cor12
    ];
    return lerCor(pickers[idx], defs[idx]);
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private target: HTMLElement;
    private legendaDiv: HTMLDivElement;
    private plotDiv: HTMLDivElement;
    private svgRoot: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private gRoot: d3.Selection<SVGGElement, unknown, null, undefined>;
    private formattingSettingsService: FormattingSettingsService;
    private formattingSettings: VisualFormattingSettingsModel;
    private tooltipService: ITooltipService;
    private selecaoLegenda: Set<string> = new Set();
    private fatiasCorrentes: FatiaDados[] = [];
    private totalCorrente: number = 0;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.tooltipService = options.host.tooltipService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.target.classList.add("rosca-host");

        this.legendaDiv = document.createElement("div");
        this.legendaDiv.className = "legenda";
        this.target.appendChild(this.legendaDiv);

        this.plotDiv = document.createElement("div");
        this.plotDiv.className = "plot-area";
        this.target.appendChild(this.plotDiv);

        this.svgRoot = d3.select(this.plotDiv).append("svg")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("preserveAspectRatio", "none");
        this.gRoot = this.svgRoot.append("g").attr("class", "raiz");

        // Limpa selecao ao clicar fora das fatias
        this.plotDiv.addEventListener("click", (ev) => {
            const target = ev.target as Element;
            if (target && target.tagName !== "path") {
                if (this.selecaoLegenda.size > 0) {
                    this.selecaoLegenda.clear();
                    this.aplicarOpacidade();
                    this.renderLegenda();
                }
            }
        });
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    public update(options: VisualUpdateOptions): void {
        const dv: DataView = options.dataViews && options.dataViews[0];
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            dv
        );

        const wView = Math.max(120, options.viewport.width);
        const hView = Math.max(80, options.viewport.height);

        this.gRoot.selectAll("*").remove();
        this.svgRoot.selectAll("text.msg").remove();

        const cfg = this.formattingSettings;

        if (!dv || !dv.categorical) {
            this.renderMensagem(wView, hView, "Arraste campos para Valor (e opcionalmente Categoria/Legenda).");
            return;
        }
        const cat = dv.categorical;
        const todasCategorias: DataViewCategoryColumn[] = cat.categories || [];
        const colsValor: DataViewValueColumn[] = (cat.values || []).filter(
            v => v.source && v.source.roles && v.source.roles["valor"]
        );
        const tooltipCols: DataViewValueColumn[] = (cat.values || []).filter(
            v => v.source && v.source.roles && v.source.roles["tooltips"]
        );

        if (colsValor.length === 0) {
            this.renderMensagem(wView, hView, "Defina ao menos um campo de Valor.");
            return;
        }

        // Identifica colunas de categoria e legenda
        let colCategoria: DataViewCategoryColumn | null = null;
        let colLegenda: DataViewCategoryColumn | null = null;
        for (const c of todasCategorias) {
            const roles = c.source && c.source.roles;
            if (!roles) continue;
            if (roles["legenda"] && !colLegenda) colLegenda = c;
            else if (roles["categoria"] && !colCategoria) colCategoria = c;
        }

        // Decide o discriminador: Legenda > Categoria > Medidas
        const discriminador: DataViewCategoryColumn | null = colLegenda || colCategoria;

        const fatias: FatiaDados[] = [];
        if (discriminador) {
            const valores = discriminador.values || [];
            const numLinhas = valores.length;
            for (let i = 0; i < numLinhas; i++) {
                const nomeBruto = valores[i];
                const nome = (nomeBruto === null || nomeBruto === undefined) ? "(em branco)" : String(nomeBruto);

                // Soma todas as medidas para esta linha
                let soma = 0;
                let formatoRef: string | undefined = undefined;
                for (const col of colsValor) {
                    const v = numOuNull(col.values ? col.values[i] : null);
                    if (v !== null && v > 0) soma += v;
                    if (!formatoRef) formatoRef = col.source.format;
                }
                if (soma <= 0) continue;

                const selId = this.host.createSelectionIdBuilder()
                    .withCategory(discriminador, i)
                    .createSelectionId();

                const tooltips = tooltipCols.map(tc => ({
                    displayName: tc.source.displayName,
                    valor: tc.values ? tc.values[i] : null,
                    formato: tc.source.format
                }));

                fatias.push({
                    chave: nome + "#" + i,
                    nome,
                    valor: soma,
                    cor: corDaFatia(cfg, fatias.length),
                    formato: formatoRef,
                    indice: i,
                    selectionId: selId,
                    tooltips
                });
            }
        } else {
            // Sem categoria nem legenda: cada medida vira uma fatia (soma de toda a coluna)
            for (let m = 0; m < colsValor.length; m++) {
                const col = colsValor[m];
                const arr = col.values || [];
                let soma = 0;
                for (const v of arr) {
                    const n = numOuNull(v);
                    if (n !== null && n > 0) soma += n;
                }
                if (soma <= 0) continue;
                fatias.push({
                    chave: col.source.displayName + "#" + m,
                    nome: col.source.displayName,
                    valor: soma,
                    cor: corDaFatia(cfg, fatias.length),
                    formato: col.source.format,
                    indice: m,
                    selectionId: null,
                    tooltips: []
                });
            }
        }

        if (fatias.length === 0) {
            this.renderMensagem(wView, hView, "Nenhum valor positivo encontrado.");
            return;
        }

        // Ordena fatias
        const ordem = lerEnum(cfg.rosca.ordemFatias, "dados");
        if (ordem === "valorDesc") fatias.sort((a, b) => b.valor - a.valor);
        else if (ordem === "valorAsc") fatias.sort((a, b) => a.valor - b.valor);
        else if (ordem === "nomeAsc") fatias.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        else if (ordem === "nomeDesc") fatias.sort((a, b) => b.nome.localeCompare(a.nome, "pt-BR"));

        // Reatribui cores apos ordenacao para respeitar a "cor da Na fatia"
        for (let i = 0; i < fatias.length; i++) fatias[i].cor = corDaFatia(cfg, i);

        // Limpa selecao apontando para chaves que sumiram
        const chavesValidas = new Set(fatias.map(f => f.nome));
        for (const c of Array.from(this.selecaoLegenda)) if (!chavesValidas.has(c)) this.selecaoLegenda.delete(c);

        const total = fatias.reduce((acc, f) => acc + f.valor, 0);
        this.fatiasCorrentes = fatias;
        this.totalCorrente = total;

        // ========= Layout: legenda + plot =========
        const exibirLeg = lerBool(cfg.legenda.exibir, true);
        const posLeg = lerEnum(cfg.legenda.posicao, "direita");
        const sizeLeg = lerNumero(cfg.legenda.fontSize, 11);
        const marcLeg = lerNumero(cfg.legenda.tamanhoMarcador, 10);
        const familyLeg = lerFonte(cfg.legenda.fontFamily, "Segoe UI, sans-serif");
        const boldLeg = lerBool(cfg.legenda.fontBold, false);
        const mostrarValLeg = lerBool(cfg.legenda.mostrarValor, false);
        const mostrarPctLeg = lerBool(cfg.legenda.mostrarPercentual, false);

        const optsRot = opcoesFormatoRotulo(cfg.rotulos);
        const casasPctLeg = lerNumero(cfg.rotulos.casasPercentual, 1);

        const nomesParaMedir = fatias.map(f => {
            let extra = "";
            if (mostrarValLeg) extra += "  " + formatarValor(f.valor, optsRot, f.formato);
            if (mostrarPctLeg) extra += "  " + formatarPercentual(f.valor / total, casasPctLeg);
            return f.nome + extra;
        });

        let larguraLeg = 0;
        let alturaLeg = 0;
        if (exibirLeg && fatias.length > 0) {
            if (posLeg === "esquerda" || posLeg === "direita") {
                let maior = 0;
                for (const n of nomesParaMedir) {
                    const lw = larguraTextoEstimada(n, familyLeg, sizeLeg, boldLeg);
                    if (lw > maior) maior = lw;
                }
                larguraLeg = Math.min(260, maior + marcLeg + 24);
            } else {
                alturaLeg = Math.max(sizeLeg, marcLeg) + 14;
            }
        }

        let wPlot = wView - larguraLeg;
        let hPlot = hView - alturaLeg;
        if (wPlot < 80) wPlot = 80;
        if (hPlot < 60) hPlot = 60;

        // Posiciona DIVs
        this.target.style.position = "relative";
        this.legendaDiv.style.position = "absolute";
        this.plotDiv.style.position = "absolute";
        if (posLeg === "topo") {
            this.legendaDiv.style.left = "0"; this.legendaDiv.style.top = "0";
            this.legendaDiv.style.width = wView + "px"; this.legendaDiv.style.height = alturaLeg + "px";
            this.plotDiv.style.left = "0"; this.plotDiv.style.top = alturaLeg + "px";
        } else if (posLeg === "base") {
            this.legendaDiv.style.left = "0"; this.legendaDiv.style.top = (hView - alturaLeg) + "px";
            this.legendaDiv.style.width = wView + "px"; this.legendaDiv.style.height = alturaLeg + "px";
            this.plotDiv.style.left = "0"; this.plotDiv.style.top = "0";
        } else if (posLeg === "esquerda") {
            this.legendaDiv.style.left = "0"; this.legendaDiv.style.top = "0";
            this.legendaDiv.style.width = larguraLeg + "px"; this.legendaDiv.style.height = hView + "px";
            this.plotDiv.style.left = larguraLeg + "px"; this.plotDiv.style.top = "0";
        } else {
            this.legendaDiv.style.left = (wView - larguraLeg) + "px"; this.legendaDiv.style.top = "0";
            this.legendaDiv.style.width = larguraLeg + "px"; this.legendaDiv.style.height = hView + "px";
            this.plotDiv.style.left = "0"; this.plotDiv.style.top = "0";
        }
        this.legendaDiv.style.display = (exibirLeg && fatias.length > 0) ? "flex" : "none";

        this.plotDiv.style.width = wPlot + "px";
        this.plotDiv.style.height = hPlot + "px";
        this.plotDiv.style.overflow = "hidden";

        this.svgRoot.attr("width", wPlot).attr("height", hPlot).attr("viewBox", `0 0 ${wPlot} ${hPlot}`);

        // ========= Render Rosca =========
        this.renderRosca(fatias, total, wPlot, hPlot, cfg);

        // Legenda
        this.renderLegenda();
        this.aplicarOpacidade();
    }

    private prepararInfoRotulos(arcs: d3.PieArcDatum<FatiaDados>[], total: number, cfg: VisualFormattingSettingsModel): InfoRotulo[] {
        const conteudo = lerEnum(cfg.rotulos.conteudo, "valorPercentual");
        const sep = lerTexto(cfg.rotulos.separador, " · ");
        const family = lerFonte(cfg.rotulos.fontFamily, "Segoe UI, sans-serif");
        const size = lerNumero(cfg.rotulos.fontSize, 10);
        const bold = lerBool(cfg.rotulos.fontBold, false);
        const casasPct = lerNumero(cfg.rotulos.casasPercentual, 1);
        const opts = opcoesFormatoRotulo(cfg.rotulos);
        const quebrar = lerBool(cfg.rotulos.quebrarLinha, true);
        const larguraMax = Math.max(30, lerNumero(cfg.rotulos.larguraMaxRotulo, 120));
        const espacoLinhas = Math.max(0, lerNumero(cfg.rotulos.espacoEntreLinhas, 2));

        return arcs.map(a => {
            const f = a.data;
            const valStr = formatarValor(f.valor, opts, f.formato);
            const pctStr = formatarPercentual(f.valor / total, casasPct);
            const partes: string[] = [];
            switch (conteudo) {
                case "valor": partes.push(valStr); break;
                case "percentual": partes.push(pctStr); break;
                case "categoria": partes.push(f.nome); break;
                case "valorPercentual": partes.push(valStr, pctStr); break;
                case "categoriaValor": partes.push(f.nome, valStr); break;
                case "categoriaPercentual": partes.push(f.nome, pctStr); break;
                case "categoriaValorPercentual": partes.push(f.nome, valStr, pctStr); break;
            }
            const textoRot = partes.filter(p => p && p.length > 0).join(sep);
            const linhas = (quebrar && textoRot) ? quebrarTextoEmLinhas(textoRot, larguraMax, family, size, bold) : (textoRot ? [textoRot] : []);
            const larguraTxt = linhas.reduce((m, l) => Math.max(m, larguraTextoEstimada(l, family, size, bold)), 0);
            const alturaTxt = Math.max(0, linhas.length * size + Math.max(0, linhas.length - 1) * espacoLinhas);
            return { texto: textoRot, linhas, larguraTxt, alturaTxt };
        });
    }

    private calcularRaioMaximoComRotulos(
        dados: { ang: number; larguraTxt: number; alturaTxt: number }[],
        w: number, h: number, distExt: number, margem: number
    ): number {
        // Comeca do raio que caberia sem rotulos e reduz iterativamente ate todos caberem
        let R = Math.min(w, h) / 2 - margem;
        const wMeio = w / 2 - margem;
        const hMeio = h / 2 - margem;

        for (let iter = 0; iter < 12 && R > 10; iter++) {
            let maiorOverflow = 0;
            for (const d of dados) {
                if (d.larguraTxt <= 0 || d.alturaTxt <= 0) continue;
                const cos = Math.cos(d.ang);
                const sin = Math.sin(d.ang);
                const ehDireita = cos >= 0;
                // No render: xTxt = (R+distExt)*cos; texto se estende `larguraTxt` para `ehDireita ? direita : esquerda`
                const xCentro = (R + distExt) * cos;
                const yCentro = (R + distExt) * sin;
                const xDir = ehDireita ? xCentro + d.larguraTxt : xCentro;
                const xEsq = ehDireita ? xCentro : xCentro - d.larguraTxt;
                const yTopo = yCentro - d.alturaTxt / 2;
                const yBaixo = yCentro + d.alturaTxt / 2;

                const overDir = xDir - wMeio;
                const overEsq = -wMeio - xEsq;
                const overTopo = -hMeio - yTopo;
                const overBaixo = yBaixo - hMeio;

                const m = Math.max(overDir, overEsq, overTopo, overBaixo);
                if (m > maiorOverflow) maiorOverflow = m;
            }
            if (maiorOverflow <= 0.5) break;
            R = Math.max(10, R - maiorOverflow - 1);
        }
        return R;
    }

    private renderRosca(fatias: FatiaDados[], total: number, w: number, h: number, cfg: VisualFormattingSettingsModel): void {
        const locacao = lerEnum(cfg.rotulos.locacao, "interno");
        const exibirRot = lerBool(cfg.rotulos.exibir, true);
        const distExt = Math.max(0, lerNumero(cfg.rotulos.distanciaExterna, 8));

        const raioExternoPct = Math.max(0.3, Math.min(1, lerNumero(cfg.rosca.raioExterno, 90) / 100));
        const larguraPct = Math.max(0.05, Math.min(1, lerNumero(cfg.rosca.larguraAnel, 45) / 100));
        const rotacao = (lerNumero(cfg.rosca.rotacaoInicial, 0)) * Math.PI / 180;
        const espacoFatiasPx = Math.max(0, lerNumero(cfg.rosca.espacoFatias, 1));
        const raioCanto = Math.max(0, lerNumero(cfg.rosca.raioCanto, 0));

        const cx = w / 2;
        const cy = h / 2;
        const margem = 4;

        // Calcula angulos preliminares (sem padAngle) so para medir rotulos
        const pieGenPrev = d3.pie<FatiaDados>()
            .value(d => d.valor)
            .sort(null)
            .startAngle(rotacao)
            .endAngle(rotacao + 2 * Math.PI);
        const arcsPrev = pieGenPrev(fatias);

        const infosRotulo: InfoRotulo[] | null = exibirRot ? this.prepararInfoRotulos(arcsPrev, total, cfg) : null;

        // Calcula raio maximo disponivel ja considerando o tamanho real dos rotulos externos
        let raioMaxDisponivel: number;
        if (exibirRot && infosRotulo && (locacao === "externo" || locacao === "linhaGuia")) {
            const dadosCalc = arcsPrev.map((a, i) => ({
                ang: (a.startAngle + a.endAngle) / 2 - Math.PI / 2,
                larguraTxt: infosRotulo[i].larguraTxt + 4, // 4px de folga apos a ancora
                alturaTxt: infosRotulo[i].alturaTxt + 2
            }));
            raioMaxDisponivel = this.calcularRaioMaximoComRotulos(dadosCalc, w, h, distExt, margem);
        } else {
            raioMaxDisponivel = Math.min(w, h) / 2 - margem;
        }

        if (raioMaxDisponivel < 10) {
            this.renderMensagem(w, h, "Espaco insuficiente para a rosca.");
            return;
        }

        const raioExterno = raioMaxDisponivel * raioExternoPct;
        const raioInterno = raioExterno * (1 - larguraPct);
        const padAngle = raioExterno > 0 ? Math.min(0.2, espacoFatiasPx / raioExterno) : 0;

        const exibirBorda = lerBool(cfg.rosca.exibirBorda, false);
        const corBorda = lerCor(cfg.rosca.corBorda, "#FFFFFF");
        const espBorda = Math.max(0, lerNumero(cfg.rosca.espessuraBorda, 1));

        const pieGen = d3.pie<FatiaDados>()
            .value(d => d.valor)
            .sort(null)
            .startAngle(rotacao)
            .endAngle(rotacao + 2 * Math.PI)
            .padAngle(padAngle);

        const arcGen = d3.arc<d3.PieArcDatum<FatiaDados>>()
            .innerRadius(raioInterno)
            .outerRadius(raioExterno)
            .cornerRadius(raioCanto);

        const arcs = pieGen(fatias);

        const gRosca = this.gRoot.append("g")
            .attr("class", "rosca")
            .attr("transform", `translate(${cx}, ${cy})`);

        // Fatias
        for (const a of arcs) {
            const path = gRosca.append("path")
                .attr("d", arcGen(a) || "")
                .attr("fill", a.data.cor)
                .attr("data-chave", a.data.nome)
                .style("cursor", "pointer");
            if (exibirBorda && espBorda > 0) {
                path.attr("stroke", corBorda).attr("stroke-width", espBorda);
            }
            this.anexarTooltip(path as any, a.data, total);
        }

        // Totalizador central
        if (lerBool(cfg.centro.exibir, true)) {
            this.renderCentro(gRosca, total, fatias, raioInterno, cfg);
        }

        // Rotulos das fatias (reaproveita infosRotulo, que sao independentes do padAngle)
        if (exibirRot && infosRotulo) {
            this.renderRotulosFatias(gRosca, arcs, infosRotulo, total, raioExterno, raioInterno, cfg, locacao);
        }
    }

    private renderCentro(gRosca: d3.Selection<SVGGElement, unknown, null, undefined>, total: number, fatias: FatiaDados[], raioInterno: number, cfg: VisualFormattingSettingsModel): void {
        const c = cfg.centro;
        const exibirTit = lerBool(c.exibirTitulo, true);
        const txtTit = lerTexto(c.tituloTexto, "Total");
        const familyTit = lerFonte(c.tituloFontFamily, "Segoe UI, sans-serif");
        const sizeTit = lerNumero(c.tituloFontSize, 11);
        const boldTit = lerBool(c.tituloFontBold, false);
        const italTit = lerBool(c.tituloFontItalic, false);
        const subTit = lerBool(c.tituloFontUnderline, false);
        const corTit = lerCor(c.tituloCor, "#6B7280");

        const familyVal = lerFonte(c.valorFontFamily, "Segoe UI, sans-serif");
        const sizeVal = lerNumero(c.valorFontSize, 22);
        const boldVal = lerBool(c.valorFontBold, true);
        const italVal = lerBool(c.valorFontItalic, false);
        const subVal = lerBool(c.valorFontUnderline, false);
        const corVal = lerCor(c.valorCor, "#111827");
        const optsVal = opcoesFormatoCentro(c);
        const espaco = Math.max(0, lerNumero(c.espacoTituloValor, 4));

        const formato = fatias[0]?.formato;
        const valStr = formatarValor(total, optsVal, formato);

        const grupo = gRosca.append("g").attr("class", "centro").attr("pointer-events", "none");

        // Calcula posicoes
        const alturaTit = exibirTit && txtTit ? sizeTit : 0;
        const alturaVal = sizeVal;
        const alturaTotal = alturaTit + (alturaTit > 0 ? espaco : 0) + alturaVal;
        const yTopo = -alturaTotal / 2;

        if (exibirTit && txtTit) {
            grupo.append("text")
                .attr("x", 0)
                .attr("y", yTopo + sizeTit * 0.75)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "alphabetic")
                .attr("font-family", familyTit)
                .attr("font-size", sizeTit)
                .attr("font-weight", boldTit ? "700" : "400")
                .attr("font-style", italTit ? "italic" : "normal")
                .attr("text-decoration", subTit ? "underline" : "none")
                .attr("fill", corTit)
                .text(this.encurtarSeMaior(txtTit, raioInterno * 2 - 6, familyTit, sizeTit, boldTit));
        }

        const yValor = yTopo + alturaTit + (alturaTit > 0 ? espaco : 0) + sizeVal * 0.78;
        grupo.append("text")
            .attr("x", 0)
            .attr("y", yValor)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "alphabetic")
            .attr("font-family", familyVal)
            .attr("font-size", sizeVal)
            .attr("font-weight", boldVal ? "700" : "400")
            .attr("font-style", italVal ? "italic" : "normal")
            .attr("text-decoration", subVal ? "underline" : "none")
            .attr("fill", corVal)
            .text(this.encurtarSeMaior(valStr, raioInterno * 2 - 6, familyVal, sizeVal, boldVal));
    }

    private encurtarSeMaior(txt: string, larguraMax: number, family: string, size: number, bold: boolean): string {
        if (!txt) return "";
        if (larguraMax <= 0) return txt;
        const l = larguraTextoEstimada(txt, family, size, bold);
        if (l <= larguraMax) return txt;
        let lo = 1, hi = txt.length;
        while (lo < hi) {
            const meio = Math.floor((lo + hi + 1) / 2);
            const cand = txt.substr(0, meio) + "...";
            if (larguraTextoEstimada(cand, family, size, bold) <= larguraMax) lo = meio;
            else hi = meio - 1;
        }
        return txt.substr(0, lo) + "...";
    }

    private renderRotulosFatias(
        gRosca: d3.Selection<SVGGElement, unknown, null, undefined>,
        arcs: d3.PieArcDatum<FatiaDados>[],
        infos: InfoRotulo[],
        total: number,
        raioExterno: number,
        raioInterno: number,
        cfg: VisualFormattingSettingsModel,
        locacao: string
    ): void {
        const alinhInt = lerEnum(cfg.rotulos.alinhamento, "centro");
        const contrasteAuto = lerBool(cfg.rotulos.contrasteAuto, true);
        const family = lerFonte(cfg.rotulos.fontFamily, "Segoe UI, sans-serif");
        const size = lerNumero(cfg.rotulos.fontSize, 10);
        const bold = lerBool(cfg.rotulos.fontBold, false);
        const italico = lerBool(cfg.rotulos.fontItalic, false);
        const sublin = lerBool(cfg.rotulos.fontUnderline, false);
        const corManual = lerCor(cfg.rotulos.cor, "#FFFFFF");
        const autoOc = lerBool(cfg.rotulos.autoOcultar, true);
        const distExt = Math.max(0, lerNumero(cfg.rotulos.distanciaExterna, 8));
        const corGuia = lerCor(cfg.rotulos.corLinhaGuia, "#9CA3AF");
        const espGuia = Math.max(0, lerNumero(cfg.rotulos.espessuraLinhaGuia, 1));
        const espacoLinhas = Math.max(0, lerNumero(cfg.rotulos.espacoEntreLinhas, 2));
        const passoLinha = size + espacoLinhas;

        const gRot = gRosca.append("g").attr("class", "rotulos").attr("pointer-events", "none");

        const desenharLinhas = (xAncora: number, yCentro: number, anchor: string, linhas: string[], cor: string) => {
            const total = linhas.length;
            if (total === 0) return;
            const alturaTotal = total * size + Math.max(0, total - 1) * espacoLinhas;
            const yPrimeira = yCentro - alturaTotal / 2 + size / 2;
            for (let i = 0; i < total; i++) {
                gRot.append("text")
                    .attr("x", xAncora)
                    .attr("y", yPrimeira + i * passoLinha)
                    .attr("text-anchor", anchor)
                    .attr("dominant-baseline", "central")
                    .attr("font-family", family).attr("font-size", size)
                    .attr("font-weight", bold ? "700" : "400")
                    .attr("font-style", italico ? "italic" : "normal")
                    .attr("text-decoration", sublin ? "underline" : "none")
                    .attr("fill", cor)
                    .text(linhas[i]);
            }
        };

        for (let i = 0; i < arcs.length; i++) {
            const a = arcs[i];
            const info = infos[i];
            const f = a.data;
            if (!info || !info.linhas || info.linhas.length === 0) continue;

            const angCentro = (a.startAngle + a.endAngle) / 2;
            const arcoAngulo = a.endAngle - a.startAngle;
            const corTextoInterno = contrasteAuto ? corContraste(f.cor) : corManual;
            const ang = angCentro - Math.PI / 2;
            const cos = Math.cos(ang);
            const sin = Math.sin(ang);

            if (locacao === "interno") {
                let raioPos: number;
                if (alinhInt === "borda") {
                    raioPos = raioExterno - Math.max(8, info.alturaTxt / 2);
                } else {
                    raioPos = (raioInterno + raioExterno) / 2;
                }
                const x = cos * raioPos;
                const y = sin * raioPos;

                const arcoLinear = arcoAngulo * ((raioInterno + raioExterno) / 2);
                const larguraAnel = raioExterno - raioInterno;
                if (autoOc && (info.larguraTxt > arcoLinear - 4 || info.alturaTxt > larguraAnel - 4)) continue;

                desenharLinhas(x, y, "middle", info.linhas, corTextoInterno);
            } else {
                const ehDireita = cos >= 0;
                const corTextoExterno = contrasteAuto ? "#374151" : corManual;
                const xBorda = cos * raioExterno;
                const yBorda = sin * raioExterno;

                if (locacao === "linhaGuia") {
                    const raioCotovelo = raioExterno + distExt * 0.5;
                    const xCot = cos * raioCotovelo;
                    const yCot = sin * raioCotovelo;
                    const xTxt = (ehDireita ? 1 : -1) * (raioExterno + distExt);
                    const yTxt = yCot;
                    gRot.append("polyline")
                        .attr("points", `${xBorda},${yBorda} ${xCot},${yCot} ${xTxt},${yTxt}`)
                        .attr("fill", "none")
                        .attr("stroke", corGuia)
                        .attr("stroke-width", espGuia);
                    desenharLinhas(xTxt + (ehDireita ? 4 : -4), yTxt, ehDireita ? "start" : "end", info.linhas, corTextoExterno);
                } else {
                    const xTxt = cos * (raioExterno + distExt);
                    const yTxt = sin * (raioExterno + distExt);
                    desenharLinhas(xTxt, yTxt, ehDireita ? "start" : "end", info.linhas, corTextoExterno);
                }
            }
        }
    }

    private anexarTooltip(sel: d3.Selection<any, unknown, null, undefined>, f: FatiaDados, total: number): void {
        if (!this.tooltipService) return;
        const cfg = this.formattingSettings;
        if (!lerBool(cfg.tooltip.exibir, true)) return;

        const optsRot = opcoesFormatoRotulo(cfg.rotulos);
        const optsCentro = opcoesFormatoCentro(cfg.centro);
        const casasPct = lerNumero(cfg.rotulos.casasPercentual, 1);

        const construir = (): VisualTooltipDataItem[] => {
            const itens: VisualTooltipDataItem[] = [];
            if (lerBool(cfg.tooltip.incluirCategoria, true)) {
                itens.push({ displayName: "Fatia", value: f.nome, color: f.cor });
            }
            if (lerBool(cfg.tooltip.incluirValor, true)) {
                itens.push({ displayName: "Valor", value: formatarValor(f.valor, optsRot, f.formato) });
            }
            if (lerBool(cfg.tooltip.incluirPercentual, true)) {
                itens.push({ displayName: "%", value: formatarPercentual(f.valor / total, casasPct) });
            }
            if (lerBool(cfg.tooltip.incluirTotal, false)) {
                itens.push({ displayName: "Total geral", value: formatarValor(total, optsCentro, f.formato) });
            }
            for (const t of f.tooltips) {
                itens.push({
                    displayName: t.displayName,
                    value: ehNumeroValido(t.valor)
                        ? formatarValor(t.valor, optsRot, t.formato)
                        : String(t.valor !== null && t.valor !== undefined ? t.valor : "")
                });
            }
            return itens;
        };

        sel.on("mousemove", (ev: MouseEvent) => {
            const rect = (this.target as HTMLElement).getBoundingClientRect();
            this.tooltipService.show({
                coordinates: [ev.clientX - rect.left, ev.clientY - rect.top],
                isTouchEvent: false,
                dataItems: construir(),
                identities: f.selectionId ? [f.selectionId as any] : []
            });
        });
        sel.on("mouseout", () => {
            this.tooltipService.hide({ isTouchEvent: false, immediately: false });
        });
    }

    private renderLegenda(): void {
        const cfg = this.formattingSettings;
        while (this.legendaDiv.firstChild) this.legendaDiv.removeChild(this.legendaDiv.firstChild);
        if (!lerBool(cfg.legenda.exibir, true) || this.fatiasCorrentes.length === 0) return;

        const pos = lerEnum(cfg.legenda.posicao, "direita");
        const alinh = lerEnum(cfg.legenda.alinhamento, "centro");
        const family = lerFonte(cfg.legenda.fontFamily, "Segoe UI, sans-serif");
        const size = lerNumero(cfg.legenda.fontSize, 11);
        const bold = lerBool(cfg.legenda.fontBold, false);
        const italico = lerBool(cfg.legenda.fontItalic, false);
        const sublin = lerBool(cfg.legenda.fontUnderline, false);
        const corT = lerCor(cfg.legenda.cor, "#374151");
        const tamMarc = lerNumero(cfg.legenda.tamanhoMarcador, 10);
        const forma = lerEnum(cfg.legenda.formaMarcador, "quadrado");
        const espacoI = Math.max(0, lerNumero(cfg.legenda.espacoItens, 12));
        const opacNao = Math.max(0, Math.min(100, lerNumero(cfg.legenda.opacidadeNaoSelecionado, 25))) / 100;
        const mostrarVal = lerBool(cfg.legenda.mostrarValor, false);
        const mostrarPct = lerBool(cfg.legenda.mostrarPercentual, false);
        const optsRot = opcoesFormatoRotulo(cfg.rotulos);
        const casasPct = lerNumero(cfg.rotulos.casasPercentual, 1);

        const horizontal = pos === "topo" || pos === "base";

        const ds = this.legendaDiv.style;
        ds.flexDirection = horizontal ? "row" : "column";
        ds.flexWrap = horizontal ? "wrap" : "nowrap";
        ds.alignItems = horizontal ? "center" : "flex-start";
        ds.justifyContent = alinh === "inicio" ? "flex-start" : (alinh === "fim" ? "flex-end" : "center");
        ds.gap = espacoI + "px";
        ds.padding = horizontal ? "4px 8px" : "8px 6px";
        ds.boxSizing = "border-box";
        ds.overflow = "hidden";
        ds.fontFamily = family;
        ds.fontSize = size + "px";

        const algumSelecionado = this.selecaoLegenda.size > 0;

        for (const f of this.fatiasCorrentes) {
            const selecionado = !algumSelecionado || this.selecaoLegenda.has(f.nome);

            const item = document.createElement("div");
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.gap = "6px";
            item.style.cursor = "pointer";
            item.style.userSelect = "none";
            item.style.opacity = selecionado ? "1" : String(Math.max(0.2, opacNao));

            const marc = document.createElement("span");
            marc.style.display = "inline-block";
            marc.style.flex = "0 0 auto";
            if (forma === "circulo") {
                marc.style.width = tamMarc + "px";
                marc.style.height = tamMarc + "px";
                marc.style.background = f.cor;
                marc.style.borderRadius = "50%";
            } else if (forma === "linha") {
                marc.style.width = tamMarc + "px";
                marc.style.height = Math.max(2, tamMarc / 4) + "px";
                marc.style.background = f.cor;
                marc.style.borderRadius = "2px";
            } else {
                marc.style.width = tamMarc + "px";
                marc.style.height = tamMarc + "px";
                marc.style.background = f.cor;
                marc.style.borderRadius = "2px";
            }

            const partes: string[] = [f.nome];
            if (mostrarVal) partes.push(formatarValor(f.valor, optsRot, f.formato));
            if (mostrarPct) partes.push(formatarPercentual(f.valor / this.totalCorrente, casasPct));
            const textoFinal = partes.join("  ");

            const txt = document.createElement("span");
            txt.textContent = textoFinal;
            txt.style.color = corT;
            txt.style.fontWeight = bold ? "700" : "400";
            txt.style.fontStyle = italico ? "italic" : "normal";
            txt.style.textDecoration = sublin ? "underline" : "none";
            txt.style.whiteSpace = "nowrap";
            txt.style.textOverflow = "ellipsis";
            txt.style.overflow = "hidden";

            item.appendChild(marc);
            item.appendChild(txt);

            item.addEventListener("click", (ev) => {
                ev.stopPropagation();
                if (ev.ctrlKey || ev.metaKey || ev.shiftKey) {
                    if (this.selecaoLegenda.has(f.nome)) this.selecaoLegenda.delete(f.nome);
                    else this.selecaoLegenda.add(f.nome);
                } else {
                    if (this.selecaoLegenda.size === 1 && this.selecaoLegenda.has(f.nome)) {
                        this.selecaoLegenda.clear();
                    } else {
                        this.selecaoLegenda.clear();
                        this.selecaoLegenda.add(f.nome);
                    }
                }
                this.aplicarOpacidade();
                this.renderLegenda();
            });

            this.legendaDiv.appendChild(item);
        }
    }

    private aplicarOpacidade(): void {
        const cfg = this.formattingSettings;
        const opacNao = Math.max(0, Math.min(100, lerNumero(cfg.legenda.opacidadeNaoSelecionado, 25))) / 100;
        const algumSel = this.selecaoLegenda.size > 0;
        const sel = this.selecaoLegenda;
        this.gRoot.selectAll<SVGElement, unknown>("[data-chave]").each(function () {
            const m = (this as Element).getAttribute("data-chave") || "";
            if (!algumSel) (this as SVGElement).setAttribute("opacity", "1");
            else (this as SVGElement).setAttribute("opacity", sel.has(m) ? "1" : String(opacNao));
        });
    }

    private renderMensagem(w: number, h: number, msg: string): void {
        while (this.legendaDiv.firstChild) this.legendaDiv.removeChild(this.legendaDiv.firstChild);
        this.legendaDiv.style.display = "none";
        this.plotDiv.style.position = "absolute";
        this.plotDiv.style.left = "0";
        this.plotDiv.style.top = "0";
        this.plotDiv.style.width = w + "px";
        this.plotDiv.style.height = h + "px";
        this.plotDiv.style.overflow = "hidden";
        this.svgRoot.attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`);
        this.gRoot.append("text")
            .attr("class", "msg")
            .attr("x", w / 2).attr("y", h / 2)
            .attr("text-anchor", "middle").attr("dominant-baseline", "central")
            .attr("font-family", "Segoe UI, sans-serif")
            .attr("font-size", 13)
            .attr("fill", "#6B7280")
            .text(msg);
    }
}
