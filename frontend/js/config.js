export const SUPABASE_URL = "https://pmcyfsajhwdjtqwjbjik.supabase.co";
export const SUPABASE_KEY = "sb_publishable_aUuHpcqxIlf0ZNuEZZWZwg_RcyDQ4vd";
export const API = SUPABASE_URL + "/functions/v1/api";
// Cada cliente novo ganha uma subpasta própria (ex.: /vilarejo/) com seu HTML e logo, mas
// reaproveita este mesmo js/ e css/. O tenant é resolvido pelo nome dessa subpasta na URL;
// fora de uma pasta de cliente conhecida, cai no cliente original (Sipolatti, na raiz).
const CLIENTES_CONHECIDOS = ["vilarejo"];
const segmentos = (globalThis.location?.pathname ?? "").split("/").filter(Boolean);
export const CLIENTE = segmentos.find((s) => CLIENTES_CONHECIDOS.includes(s)) ?? "sipolatti";
