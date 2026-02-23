export const PET_ASCII_SPRITE_SHEET = Object.freeze({
  neutral: {
    fps: 1,
    loop: true,
    frames: [
      { face: "•ᴥ•", body: "/|_|\\", status: "on-line" },
      { face: "•ᴥ•", body: "/|_|\\", status: "..." },
      { face: "-ᴥ-", body: "/|_|\\", status: "..." },
      { face: "•ᴥ•", body: "/|_|\\", status: "..." },
      { face: "◕ᴥ◕", body: "/|_|\\", status: "aguardando" },
      { face: "•ᴥ•", body: "/|_|\\", status: "..." },
      { face: "•ᴥ•", body: "/|_|\\", status: "on-line" },
      { face: "ᵔᴥᵔ", body: "/|_|\\", status: "..." },
      { face: "•ᴥ•", body: "/|_|\\", status: "..." },
      { face: "-ᴥ-", body: "/|_|\\", status: "..." },
      { face: "•ᴥ•", body: "/|_|\\", status: "on-line" }
    ]
  },
  wake: {
    fps: 7,
    loop: false,
    frames: [
      { face: "-ᴥ-", body: "/|_|\\", status: "booting..." },
      { face: "•ᴥ•", body: "/|_|\\", status: "carregando" },
      { face: "ᵔᴥᵔ", body: "/|_|\\", status: "✓ pronto" },
      { face: "•̀ᴥ•́", body: "/|_|\\", status: "monitorando" },
      { face: "•ᴥ•", body: "/|_|\\", status: "on-line" }
    ]
  },
  click: {
    fps: 10,
    loop: false,
    frames: [
      { face: "⊙ᴥ⊙", body: "/|_|\\", status: "! clique !" },
      { face: "ಠᴥಠ", body: "/|_|\\", status: "te vi" },
      { face: "◉ᴥ◉", body: "/|_|\\", status: "confirmado" },
      { face: "•ᴥ•", body: "/|_|\\", status: "ok" }
    ]
  },
  key: {
    fps: 14,
    loop: false,
    frames: [
      { face: "•̀ᴥ•́", body: "/|_|\\", status: "⌨..." },
      { face: "◉ᴥ◉", body: "/|_|\\", status: "digitando" },
      { face: "•̀ᴥ•́", body: "/|_|\\", status: "input lido" },
      { face: "•ᴥ•", body: "/|_|\\", status: "..." }
    ]
  },
  idle: {
    fps: 2,
    loop: true,
    frames: [
      { face: "˘ᴥ˘", body: "/|_|\\", status: "z z z" },
      { face: "-ᴥ-", body: "/|_|\\", status: "..." },
      { face: "˘ᴥ˘", body: "/|_|\\", status: "economia" },
      { face: "-ᴥ-", body: "/|_|\\", status: "..." }
    ]
  },
  idleScan: {
    fps: 8,
    loop: false,
    frames: [
      { face: "◉ᴥ•", body: "/|_|\\", status: "varrendo..." },
      { face: "•ᴥ◉", body: "/|_|\\", status: "checando" }
    ]
  },
  idleStretch: {
    fps: 6,
    loop: false,
    frames: [
      { face: "ᵔᴥᵔ", body: "/|_|\\", status: "alongando" },
      { face: "•ᴥ•", body: "/|_|\\", status: "ok" }
    ]
  },
  blink: {
    fps: 14,
    loop: false,
    frames: [{ face: "-ᴥ-", body: "/|_|\\", status: "..." }]
  },
  command: {
    fps: 8,
    loop: false,
    frames: [
      { face: "•ᴥ•", body: "/|_|\\", status: "processando" },
      { face: "ᵔᴥᵔ", body: "/|_|\\", status: "executando" },
      { face: "＾ᴥ＾", body: "/|_|\\", status: "ok! ✓" },
      { face: "ᵔᴥᵔ", body: "/|_|\\", status: "concluido" },
      { face: "•ᴥ•", body: "/|_|\\", status: "on-line" }
    ]
  },
  error: {
    fps: 8,
    loop: false,
    frames: [
      { face: "xᴥx", body: "/|_|\\", status: "!! erro !!" },
      { face: "ಠᴥಠ", body: "/|_|\\", status: "opa..." },
      { face: "xᴥx", body: "/|_|\\", status: "!! erro !!" },
      { face: "ಠᴥಠ", body: "/|_|\\", status: "vamos de novo" },
      { face: "•ᴥ•", body: "/|_|\\", status: "aguardando" }
    ]
  },
  reload: {
    fps: 9,
    loop: false,
    frames: [
      { face: "↻ᴥ↻", body: "/|_|\\", status: "recarregando" },
      { face: "◉ᴥ◉", body: "/|_|\\", status: "limpando..." },
      { face: "↻ᴥ↻", body: "/|_|\\", status: "quase la" },
      { face: "ᵔᴥᵔ", body: "/|_|\\", status: "✓ pronto" },
      { face: "•ᴥ•", body: "/|_|\\", status: "on-line" }
    ]
  },
  modeGui: {
    fps: 7,
    loop: false,
    frames: [
      { face: "◕ᴥ◕", body: "/|_|\\", status: "▣ GUI" },
      { face: "＾ᴥ＾", body: "/|_|\\", status: "janela aberta" },
      { face: "•ᴥ•", body: "/|_|\\", status: "on-line" }
    ]
  },
  modeCli: {
    fps: 7,
    loop: false,
    frames: [
      { face: "•ᴥ•", body: "/|_|\\", status: "▤ CLI" },
      { face: "•̀ᴥ•́", body: "/|_|\\", status: "prompt pronto" },
      { face: "•ᴥ•", body: "/|_|\\", status: "on-line" }
    ]
  },
  guiIcon: {
    fps: 10,
    loop: false,
    frames: [
      { face: "◉ᴥ◉", body: "/|_|\\", status: "icone detectado" },
      { face: "＾ᴥ＾", body: "/|_|\\", status: "GUI em ação" },
      { face: "•ᴥ•", body: "/|_|\\", status: "ok" }
    ]
  },
  themeChange: {
    fps: 9,
    loop: false,
    frames: [
      { face: "◕ᴥ◕", body: "/|_|\\", status: "trocando tema..." },
      { face: "⊙ᴥ⊙", body: "/|_|\\", status: "sincronizando" },
      { face: "＾ᴥ＾", body: "/|_|\\", status: "✓ aplicado" },
      { face: "•ᴥ•", body: "/|_|\\", status: "on-line" }
    ]
  }
});
