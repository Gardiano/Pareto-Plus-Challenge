import 'dotenv/config';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config TESS
const TESS_API_BASE = "https://tess.pareto.io/api/agents";
const TESS_AGENT_ID = 28268;
const MODEL = "gpt-4o-latest";
const TOOLS = "tools";

// Prompt original
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

// Paths de saída
const CSV_PATH = path.join(__dirname, "usuarios_energia_renovavel.csv");
const PROMPT_PATH = path.join(__dirname, "prompt.txt");
const SEP = ";";

// Parser e validação
function parseAndValidate(text) {
  let totalLines = 0;
  const validRows = [];
  const invalidLines = [];
  if (!text) return { rows: validRows, totalLines, invalidLines };

  for (const raw of text.split(/\r?\n/)) {
    totalLines += 1;
    const line = raw.trim();
    if (!line) continue;
    // ignora cercas de código
    if (line.startsWith("```") || line.endsWith("```")) {
      invalidLines.push([totalLines, raw]);
      continue;
    }
    // exige exatamente 3 ';'
    if ((line.match(/;/g) || []).length !== 3) {
      invalidLines.push([totalLines, raw]);
      continue;
    }
    const parts = line.split(";").map((p) => p.trim());
    if (parts.length !== 4 || parts.some((p) => p.length === 0)) {
      invalidLines.push([totalLines, raw]);
      continue;
    }
    validRows.push(parts);
  }
  return { rows: validRows, totalLines, invalidLines };
}

// Escape para CSV
function csvEscape(field) {
  if (field == null) return "";
  const v = String(field);
  const escaped = v.replace(/"/g, '""');
  const needsQuote = v.includes(SEP) || v.includes('"') || v.includes("\n");
  return needsQuote ? `${escaped}` : escaped;
}

// Extrai o conteúdo do retorno da TESS
function extractContentFromTessResponse(data) {
  if (!data) return "";

  // Estrutura conforme doc: data.responses[...].output
  if (Array.isArray(data.responses) && data.responses.length) {
    // Pega a última com algum output não vazio
    const withOutput = [...data.responses].reverse().find(
      r => r && typeof r.output === "string" && r.output.trim().length > 0
    );
    if (withOutput) return withOutput.output;
    // fallback: se não houver output ainda, tenta a última
    const last = data.responses[data.responses.length - 1];
    if (last && typeof last.output === "string") return last.output;
  }

  // Fallbacks genéricos
  if (typeof data.output === "string") return data.output;
  if (data.output && typeof data.output.content === "string") return data.output.content;
  if (typeof data.result === "string") return data.result;
  if (data.result && typeof data.result.content === "string") return data.result.content;
  if (Array.isArray(data.messages)) {
    const lastAssistant = [...data.messages].reverse().find(m => m?.role === "assistant" && typeof m.content === "string");
    if (lastAssistant) return lastAssistant.content;
  }
  return "";
}

async function main() {
  // Salva o prompt usado
  fs.writeFileSync(PROMPT_PATH, PROMPT, { encoding: "utf-8" });

  let content = "";
  try {
    const body = {
      messages: [{ role: "user", content: PROMPT }],
      wait_execution: true,
      model: MODEL,
      tools: TOOLS,
      temperature: String(0.3)
    };

    const resp = await fetch(`${TESS_API_BASE}/${encodeURIComponent(TESS_AGENT_ID)}/execute`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.TESS_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status} - ${errorText}`);
    }

    const data = await resp.json();
    content = extractContentFromTessResponse(data) || "";
  } catch (err) {
    console.error("Erro na chamada ao LLM (TESS):", err?.message || err);
    process.exit(1);
  }

  // Parse e validação
  const { rows, totalLines, invalidLines } = parseAndValidate(content);

  // Exigir exatamente 50 válidas
  let finalRows = rows;
  if (finalRows.length > 50) finalRows = finalRows.slice(0, 50);

  if (finalRows.length < 50) {
    console.error(`Erro: foram validadas ${finalRows.length} linhas (esperado: 50). Linhas brutas recebidas: ${totalLines}.`);
    if (invalidLines.length) {
      console.error("Algumas linhas inválidas (índice, conteúdo):");
      invalidLines.slice(0, 5).forEach(([idx, raw]) => {
        console.error(`- ${idx}: ${raw}`);
      });
      if (invalidLines.length > 5) {
        console.error(`(${invalidLines.length - 5} inválidas adicionais)`);
      }
    }
    process.exit(2);
  }

  // Geração do CSV
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

  console.log(`Concluído com sucesso. Linhas válidas salvas: ${finalRows.length} - exatamente 50 .`);
  console.log(`Arquivo CSV: ${CSV_PATH}`);
  console.log(`Prompt salvo em ${PROMPT_PATH}`);
}

main().catch((e) => {
  console.error("Falha inesperada:", e);
  process.exit(99);
});
