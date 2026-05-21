import { createContext, useContext } from 'react'

export type Lang = 'pt' | 'en'

export const LANG_STORAGE_KEY = 'snapshare.lang'

type Dict = Record<string, string>

const pt: Dict = {
  // Generic
  connecting: 'A ligar…',
  scan_other: 'Lê o QR a partir de outro dispositivo',
  pair: 'Ligar',
  disconnect: 'Desligar',
  disconnect_all: 'Desligar todos',
  collapse_all: 'Recolher tudo',
  back_to_top: 'Voltar ao topo',
  copy_code: 'Copiar código',
  toggle_qr: 'Mostrar/ocultar QR',

  // Header
  your_code: 'O teu código',

  // Paired devices
  paired_devices: 'Dispositivos ligados',

  // Recent
  recent: 'Recentes',
  forget: 'Esquecer',

  // Pair input
  add_another_device: 'Adicionar outro dispositivo',
  enter_code_from_other: 'Introduz o código do outro dispositivo',
  scan_qr_camera_screen: 'Lê QR (câmara ou ecrã)',

  // Drop zone
  tap_or_drop: 'Toca ou solta ficheiros',
  drop_hint: 'Qualquer coisa — fotos, vídeos, documentos',
  pair_to_send: 'Liga para enviar',
  connect_first: 'Liga um dispositivo primeiro',
  add_files: 'Adicionar ficheiros',
  send_to_n_devices: 'Enviar para {n} dispositivos',
  files_waiting: 'ficheiro à espera de um dispositivo…',
  files_waiting_plural: 'ficheiros à espera de um dispositivo…',

  // Transfers
  transfers: 'Transferências',
  no_transfers: 'Ainda sem transferências',
  transfers_hint: 'Ficheiros enviados ou recebidos aparecem aqui',
  show_all: 'Mostrar todos',
  show_less: 'Mostrar menos',
  complete: 'Concluído',
  save_again: 'Guardar novamente',
  from: 'de',
  to: 'para',

  // QR Scanner
  scan_qr_code: 'Ler código QR',
  camera: 'Câmara',
  screen: 'Ecrã',
  close: 'Fechar',
  starting: 'A iniciar',
  camera_hint: 'Aponta para o QR do outro dispositivo',
  screen_hint: 'Partilha o ecrã onde o QR está visível',

  // Errors
  err_code_not_found: 'Código não encontrado. Verifica e tenta de novo.',
  err_self_pair: 'Não podes ligar a ti próprio.',

  // Footer
  footer_tagline: 'Transferência ponto-a-ponto, gratuita, entre quaisquer dois dispositivos por código QR. Sem contas, sem perda de qualidade.',
  privacy: 'Privacidade',
  privacy_body: 'Os ficheiros são transferidos diretamente entre dispositivos via WebRTC e nunca passam por nenhum servidor. Apenas um pequeno handshake de sinalização (alguns KB) atravessa o broker; o conteúdo dos ficheiros, não.',
  privacy_disclaimer: 'Fornecido tal como está, sem garantia. Não recolhemos nem armazenamos dados.',
  built_by: 'Feito por',
  source_github: 'Código no GitHub',
  made_in: 'Feito em Luanda',
  language: 'Idioma',
  theme: 'Tema',
  install_app: 'Instalar app',
  install_hint: 'Adicionar ao ecrã principal',
  installed: 'App instalada',
  install_ios_hint: 'Para instalar no iOS: toca em Partilhar (□↑) → "Adicionar ao Ecrã Principal".',
  clipboard_capture: 'Captura da área de transferência',
  clipboard_on: 'Captura ligada',
  clipboard_off: 'Captura desligada',
  clipboard_permission: 'Permissão de área de transferência negada. Ativa-a nas definições do navegador.',
  tap_to_copy: 'Tocar para copiar',
  copied: 'Copiado',
  copy_text: 'Copiar texto',
  resend: 'Reenviar',
}

const en: Dict = {
  connecting: 'Connecting…',
  scan_other: 'Scan from any other device',
  pair: 'Pair',
  disconnect: 'Disconnect',
  disconnect_all: 'Disconnect all',
  collapse_all: 'Collapse all',
  back_to_top: 'Back to top',
  copy_code: 'Copy code',
  toggle_qr: 'Toggle QR',

  your_code: 'Your code',

  paired_devices: 'Paired devices',

  recent: 'Recent',
  forget: 'Forget',

  add_another_device: 'Add another device',
  enter_code_from_other: 'Enter code from other device',
  scan_qr_camera_screen: 'Scan QR (camera or screen)',

  tap_or_drop: 'Tap or drop files',
  drop_hint: 'Anything — photos, videos, docs',
  pair_to_send: 'Pair to send',
  connect_first: 'Connect a device first',
  add_files: 'Add files',
  send_to_n_devices: 'Send to {n} devices',
  files_waiting: 'file waiting for a device…',
  files_waiting_plural: 'files waiting for a device…',

  transfers: 'Transfers',
  no_transfers: 'No transfers yet',
  transfers_hint: 'Files sent or received will appear here',
  show_all: 'Show all',
  show_less: 'Show less',
  complete: 'Complete',
  save_again: 'Save again',
  from: 'from',
  to: 'to',

  scan_qr_code: 'Scan QR Code',
  camera: 'Camera',
  screen: 'Screen',
  close: 'Close',
  starting: 'Starting',
  camera_hint: "Point at the QR shown on the other device",
  screen_hint: 'Share the screen showing the QR code',

  err_code_not_found: 'Code not found. Check the code and try again.',
  err_self_pair: "Can't pair with yourself.",

  footer_tagline: 'Free peer-to-peer file transfer between any two devices via QR code. No accounts, no quality loss.',
  privacy: 'Privacy',
  privacy_body: 'Files transfer directly between devices over WebRTC and are never uploaded to any server. Only a brief signaling handshake (a few KB) passes through a broker; file contents do not.',
  privacy_disclaimer: 'Provided as-is, without warranty. No data is collected or stored.',
  built_by: 'Built by',
  source_github: 'Source on GitHub',
  made_in: 'Made in Luanda',
  language: 'Language',
  theme: 'Theme',
  install_app: 'Install app',
  install_hint: 'Add to home screen',
  installed: 'App installed',
  install_ios_hint: 'On iOS: tap Share (□↑) → "Add to Home Screen".',
  clipboard_capture: 'Clipboard capture',
  clipboard_on: 'Capture on',
  clipboard_off: 'Capture off',
  clipboard_permission: 'Clipboard permission denied. Enable it in browser settings.',
  tap_to_copy: 'Tap to copy',
  copied: 'Copied',
  copy_text: 'Copy text',
  resend: 'Resend',
}

export const dictionaries: Record<Lang, Dict> = { pt, en }

export interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: keyof typeof pt, vars?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nContextValue>({
  lang: 'pt',
  setLang: () => { /* default no-op */ },
  t: (key) => String(key),
})

export function useT() {
  return useContext(I18nContext)
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}

export function loadLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY)
    if (saved === 'pt' || saved === 'en') return saved
  } catch { /* noop */ }
  return 'pt'
}

export function saveLang(lang: Lang): void {
  try { localStorage.setItem(LANG_STORAGE_KEY, lang) } catch { /* noop */ }
}
