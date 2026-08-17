// Cargador de prompts — lee archivos .md y los sirve con cache
import * as fs from 'fs';
import * as path from 'path';

interface PromptInfo {
  contenido: string;
  metadata: { nombre?: string; descripcion?: string };
}

const cache = new Map<string, PromptInfo>();
const promptsDir = path.resolve(__dirname);

function parsearFrontmatter(texto: string): { metadata: Record<string, string>; contenido: string } {
  const match = texto.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, contenido: texto };

  const yaml = match[1];
  const contenido = match[2];
  const metadata: Record<string, string> = {};
  for (const linea of yaml.split('\n')) {
    const m = linea.match(/^(\w+):\s*(.+)$/);
    if (m) metadata[m[1]] = m[2].trim();
  }
  return { metadata, contenido };
}

export function cargarPrompt(nombre: string): string {
  if (cache.has(nombre)) {
    return cache.get(nombre)!.contenido;
  }
  const archivo = path.join(promptsDir, `${nombre}.md`);
  if (!fs.existsSync(archivo)) {
    throw new Error(`Prompt no encontrado: ${nombre} (buscado en ${archivo})`);
  }
  const texto = fs.readFileSync(archivo, 'utf8');
  const { metadata, contenido } = parsearFrontmatter(texto);
  cache.set(nombre, { contenido, metadata });
  return contenido;
}

export function listarPrompts(): string[] {
  return fs.readdirSync(promptsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}

export function invalidarCache(): void {
  cache.clear();
}
