import 'dotenv/config';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = "chatgpt-4o-latest";

const PROMPT = `Você é um gerador de dados sintéticos para testes de um produto voltado ao setor de energia renovável no Brasil. Gere usuários falsos, plausíveis e NÃO relacionados a pessoas reais ou figuras públicas.

Contexto (use como guia para cidades e profissões):
O Brasil está expandindo rapidamente seu setor de energia renovável, especialmente eólica e solar. Os principais polos de desenvolvimento estão no Nordeste (Bahia, Ceará, Pernambuco) e em Minas Gerais, com grandes fazendas solares e parques eólicos sendo construídos.
  
Tarefa:
Gerar exatamente 50 linhas de usuários em uma única resposta. Cada linha deve seguir estritamente o formato:
nome_completo;email;cidade_estado;profissao_contextual

Regras de formatação e qualidade:

Não inclua cabeçalho, explicações, comentários, numeração ou texto adicional antes ou depois das linhas.

Cada linha deve conter exatamente 3 pontos e vírgulas, resultando em 4 campos.

nome_completo: nome brasileiro plausível (2 a 3 partes). Evite nomes de pessoas reais notórias.

email: todo em minúsculas; sem acentos; substituir espaços/acentos por caracteres ASCII; use provedores comuns (ex.: gmail.com, outlook.com, yahoo.com.br) ou dominios genéricos; evite duplicados.

cidade_estado: foque principalmente em cidades dos estados BA, CE, PE e MG, no formato “Cidade, UF” (ex.: Salvador, BA). Exemplos de cidades: Salvador, Feira de Santana, Juazeiro, Caetité, Barreiras (BA); Fortaleza, Sobral, Caucaia, Aracati, Camocim (CE); Recife, Petrolina, Serra Talhada, Garanhuns, Ipojuca (PE); Belo Horizonte, Uberlândia, Uberaba, Pirapora, Montes Claros, Janaúba (MG).

profissao_contextual: profissão diretamente relacionada a energia eólica e/ou solar (ex.: Engenheiro(a) de Energia Eólica, Técnico(a) de Manutenção de Turbinas Eólicas, Analista de Projetos Solares, Eletricista Fotovoltaico, Especialista em SCADA, Analista de Licenciamento Ambiental – Renováveis, Engenheiro(a) de Interconexão, Gestor(a) de O&M Solar, Planejador(a) de Manutenção, Analista de Performance de Parques Eólicos). Use português do Brasil e variações plausíveis.

Não use ponto e vírgula dentro dos campos. Evite espaços extras no início/fim dos campos.

A saída deve ser apenas as 50 linhas de dados. Nada mais.

Exemplos (few-shot; siga exatamente o formato):
Marina Alves;marina.alves@gmail.com;Caetité, BA;Engenheira de Energia Eólica
Rafael Nogueira;rafael.nogueira@outlook.com;Pirapora, MG;Coordenador de Operações de Parque Eólico
Claudia Rocha;claudia.rocha@yahoo.com.br;Petrolina, PE;Analista de Viabilidade de Projetos Solares

Agora gere exatamente 50 linhas de usuários no formato nome;email;cidade_estado;profissao_contextual, seguindo rigorosamente todas as regras acima. Não inclua nenhum texto adicional antes ou depois das linhas.

Siga essas regras atentamente:
Nunca use emojis.
Nunca saia do seu escopo de atuação.
`;

// path para salvar o arquivo csv
const CSV_PATH = path.join(__dirname, "usuarios_energia_renovavel.csv");
// path para salvar o .txt do prompt
const PROMPT_PATH = path.join(__dirname, "prompt.txt");
// delimitador para estado_cidade ser formatado em estado, UF (Exemplo: São Paulo, SP)
const SEP = ";";

// função para parsed dos dados
function parseAndValidate(text) {
    let totalLines = 0;
    const validRows = [];
    const invalidLines = [];

    // condição para falta de dados a serem parseados.
    if (!text) return { rows: validRows, totalLines, invalidLines };

    for (const raw of text.split(/\r?\n/)) {
        totalLines += 1;
        const line = raw.trim();
        if (!line) continue;
        // Ignora possíveis cercas de código
        if (line.startsWith("```") || line.endsWith("```")) {
            invalidLines.push([totalLines, raw]);
            continue;
        }
        // as linhas de dados ficticios devem conter exatamente 3 ';' (4 campos)
        if ((line.match(/;/g) || []).length !== 3) {
            invalidLines.push([totalLines, raw]);
            continue;
        }

        const parts = line.split(";").map((p) => p.trim());
        // caso as linhas de cada dado de usuarios sejam diferentes do tipo e valor ou alguma nao conter valor
        if (parts.length !== 4 || parts.some((p) => p.length === 0)) {
            invalidLines.push([totalLines, raw]);
            continue;
        }
        // caso estejam validas, são adicionadas no array validRows
        validRows.push(parts);
    }

    // desestruturação para retorno dos dados parseados.
    return { rows: validRows, totalLines, invalidLines };
}

function csvEscape(field) {
    // verificação para campos nulos
    if (field == null) return "";
    const v = String(field);
    const escaped = v.replace(/"/g, '""');
    const needsQuote = v.includes(SEP) || v.includes('"') || v.includes("\n");
    return needsQuote ? "${escaped}" : escaped;
}

async function main() {
    // Salva o prompt usado
    fs.writeFileSync(PROMPT_PATH, PROMPT, { encoding: "utf-8" });

    // Chamada a Api (LLM) (usa OPENAI_API_KEY que está setada no arquivo .env na raiz do projeto)
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let content = "";
    try {
        const resp = await client.chat.completions.create({
            model: MODEL,
            messages: [{ role: "user", content: PROMPT }],
            temperature: 0.3,
            max_tokens: 2000,
        });
        content = resp?.choices?.[0]?.message?.content || "";
    } catch (err) {
        console.error("Erro na chamada ao LLM:", err?.message || err);
        process.exit(1);
    }

    // Parse e validação - adição do output do LLM a função de parse e validação dos dados
    const { rows, totalLines, invalidLines } = parseAndValidate(content);

    // Exigir exatamente 50 válidas: cortar excedentes; abortar se faltar
    let finalRows = rows;
    // caso existe mais de 50 linhas de usuários criados ira usar exigir que use exatamente 50 usuarios. (dados de usuario)
    if (finalRows.length > 50) {
        finalRows = finalRows.slice(0, 50);
    }

    if (finalRows.length < 50) {
        console.error(`Erro: foram validadas ${finalRows.length} linhas (esperado: 50). Linhas brutas recebidas: ${totalLines}.`);
        if (invalidLines.length) {
            console.error("Algumas linhas inválidas (índice, conteúdo):");
            invalidLines.slice(0, 5).forEach(([idx, raw]) => {
                console.error(`- ${idx}: ${raw}`);
            });
            if (invalidLines.length > 5) {
                console.error(... `(${invalidLines.length - 5} inválidas adicionais)`);
            }
        }
        process.exit(2);
    }

    // Geração do CSV (delimitado por vírgula, UTF-8)
    try {
        const header = ["nome_completo", "email", "cidade_estado", "profissao_contextual"];
        const lines = [header.map(csvEscape).join(SEP)].concat(
            finalRows.map(cols => cols.map(csvEscape).join(SEP))
        );
        fs.writeFileSync(CSV_PATH, lines.join("\n"), { encoding: "utf-8" });
    } catch (err) {
        console.error("Erro ao salvar CSV:", err?.message || err);
        process.exit(3);
    }

    console.log(`Concluído com sucesso. Linhas válidas salvas: ${finalRows.length} - exatamente 50 .`)
    console.log(`Arquivo CSV: ${CSV_PATH}`)
    console.log(`Prompt salvo em ${PROMPT_PATH}`)
}

// caso algum error aconteça, sera enviado um log com o tipo de error.
main().catch((e) => {
    console.error("Falha inesperada:", e);
    process.exit(99);
});