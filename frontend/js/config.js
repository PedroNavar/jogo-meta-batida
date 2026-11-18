export const SUPABASE_URL = "https://pmcyfsajhwdjtqwjbjik.supabase.co";
export const SUPABASE_KEY = "sb_publishable_aUuHpcqxIlf0ZNuEZZWZwg_RcyDQ4vd";
export const API = SUPABASE_URL + "/functions/v1/api";
// Um cliente pode ter subpasta própria (ex.: /vilarejo/, com HTML e logo dedicados) OU
// não ter subpasta nenhuma e ser resolvido só por "?c=slug" na URL (criado pelo admin, sem
// precisar de deploy de arquivo — a marca, nesse caso, vem toda do /config em tempo real,
// ver aplicarMarca() em cliente.js). "?c=" na URL sempre GANHA da subpasta quando os dois
// aparecem (não deveria acontecer, mas não custa ser explícito).
const CLIENTES_CONHECIDOS = ["vilarejo"];
const segmentos = (globalThis.location?.pathname ?? "").split("/").filter(Boolean);
const paramC = new URLSearchParams(globalThis.location?.search ?? "").get("c");
export const CLIENTE = paramC || segmentos.find((s) => CLIENTES_CONHECIDOS.includes(s)) || "sipolatti";
