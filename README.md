# Rosca Interativa - Power BI Custom Visual

Visual personalizado do Power BI: **rosca (donut)** totalmente configuravel, com **categoria opcional**, **legenda opcional**, **multiplas medidas** no campo de valor, **totalizador central**, **rotulos com quebra de linha** e **raio dinamico** que se ajusta automaticamente ao tamanho dos rotulos externos.

## Logica adaptativa de formacao das fatias

A rosca se forma com qualquer combinacao de campos:

| Campos preenchidos | Como vira fatias |
|---|---|
| **Legenda** (com ou sem Categoria/Valor) | Cada valor distinto da Legenda vira uma fatia; valor = soma das medidas na linha. |
| **Categoria** (sem Legenda) | Cada valor distinto da Categoria vira uma fatia; valor = soma das medidas na linha. |
| **Apenas Valor** com varias medidas | Cada medida vira uma fatia; valor = soma da coluna inteira. |

Ou seja, **nao e obrigatorio ter Categoria nem Legenda** — basta colocar 2+ medidas no campo Valor e a rosca ja se forma sozinha.

## Recursos principais

### Rosca
- **Raio externo** ajustavel (% do menor lado disponivel)
- **Largura do anel** ajustavel (% do raio externo) — controla o "buraco" da rosca
- **Rotacao inicial** em graus (-360 a +360)
- **Espaco entre fatias** em pixels (convertido para padAngle)
- **Arredondamento dos cantos** (cornerRadius do d3.arc)
- **Ordem das fatias**: ordem dos dados, maior/menor valor, A-Z, Z-A
- **Borda** opcional com cor e espessura

### Totalizador central
- Toggle exibir / ocultar
- **Titulo** independente (texto livre, fonte, tamanho, cor, negrito/italico/sublinhado)
- **Valor** independente (fonte, tamanho, cor, formato numerico completo)
- Espaco ajustavel entre titulo e valor
- Truncamento automatico se o texto for maior que o raio interno

### Cores
- Ate **12 cores manuais** atribuidas por posicao (1a fatia, 2a fatia, ...)

### Rotulos das fatias
- **7 modos de conteudo**: valor; %; categoria; valor+%; categoria+valor; categoria+%; categoria+valor+%
- **Separador customizavel** entre as partes (padrao `" · "`)
- **3 locacoes**: interno (dentro da fatia), externo (fora), externo com linha guia
- **Alinhamento interno**: centro do anel ou junto a borda externa
- **Cor automatica de contraste** (branca em fatias escuras, preta em claras) ou cor manual
- Fonte, tamanho, cor, negrito, italico, sublinhado
- **Formato numerico completo** com prefixo e sufixo (ex.: `R$ ` / ` un`)
- **Casas decimais** separadas para valor e para percentual
- **Abreviacao** mil/mi/bi opcional
- **Auto-ocultar** quando o rotulo nao cabe na fatia
- **Quebra de linha automatica** com largura maxima configuravel
- **Espaco entre linhas** ajustavel

### Raio dinamico (anti-esmagamento)
Quando o rotulo e externo, o visual **mede a largura real** de cada rotulo (considerando fonte, tamanho e quebra de linha) e calcula iterativamente o maior raio possivel para que **todos os rotulos caibam** no viewport. Resultado: rotulos grandes nao esmagam a rosca; cada lado contribui apenas com o que ele precisa.

### Legenda
- 4 posicoes: topo, base, esquerda, direita
- Alinhamento inicio/centro/fim
- Fonte, tamanho, cor, formatacao
- 3 formas de marcador: quadrado, circulo, linha
- Opcao de mostrar valor e/ou % ao lado do nome
- **Clique para destacar** uma fatia (Ctrl+click para selecao multipla)
- Opacidade configuravel para fatias nao-selecionadas

### Tooltip
- Inclusao opcional de categoria, valor, percentual e total geral
- Suporte a medidas extras no campo "Dica de ferramenta"

### Formatos numericos
- Automatico (le `formato da coluna`), decimal, inteiro, percentual (fracao 0-1 ou ja em %), moeda BRL/USD/EUR
- Abreviacao mil/mi/bi com limiar configuravel
- Prefixo e sufixo livres
- Localizacao **pt-BR** (separadores 1.234,56)

## Campos (data roles)

| Campo | Tipo | Multiplicidade | Funcao |
|---|---|---|---|
| Categoria | Grouping | opcional, max 1 | Discriminador secundario das fatias |
| Valor | Measure | 1 ou mais | Valor numerico de cada fatia |
| Legenda | Grouping | opcional, max 1 | Discriminador primario (prevalece sobre Categoria) |
| Dica de ferramenta | Measure | 0 ou mais | Medidas extras exibidas no tooltip |

## Estrutura do projeto

```
Visual Power BI 6/
├── capabilities.json       # Data roles + objects do painel
├── pbiviz.json             # Metadata do visual
├── package.json            # Dependencias (D3.js, powerbi-visuals-api)
├── tsconfig.json
├── src/
│   ├── visual.ts           # Render principal (D3 pie/arc + centro + rotulos + legenda)
│   ├── settings.ts         # Formatting model (cards do painel)
│   └── numberFormatter.ts  # Formatador pt-BR com moeda/percentual/abreviacao
├── style/
│   └── visual.less
└── assets/
    └── icon.png
```

## Build

```bash
npm install
npx pbiviz package   # gera dist/roscaInterativaA1B2C3D4E5F6.<versao>.pbiviz
```

Importar o arquivo `.pbiviz` no Power BI Desktop em **Inserir > Mais visuais > Importar visual de um arquivo**.

## Versoes

- **1.1.0.0** — Raio dinamico baseado no tamanho real dos rotulos externos (resolve rosca esmagada); quebra de linha automatica em rotulos longos; novos campos `quebrarLinha`, `larguraMaxRotulo`, `espacoEntreLinhas`.
- **1.0.0.0** — Versao inicial: rosca com categoria/legenda opcionais, totalizador central, rotulos internos/externos/com linha guia, 12 cores manuais, legenda interativa.

## Autor

Rodrigo de Souza Barbosa — rodzbar@outlook.com
