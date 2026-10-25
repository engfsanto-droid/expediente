/* ============================================================
   CONFIGURAÇÃO DO APP EXPEDIENTE — único arquivo para editar.
   ============================================================ */
self.CONFIG = {
  // Endereço do servidor: o link do Apps Script que termina em /exec
  servidor: 'https://script.google.com/macros/s/AKfycbyEs2iEoYT4Uz7DGop28LX22_o6TE9ZW3O7XMb2PlXxYGpn_ERIDSdYgYeqnzdeUm4N/exec',

  // Avisos no celular (Firebase). Deixe null enquanto não configurar.
  // Depois troque null pelo bloco do Firebase, por exemplo:
  // firebase: { apiKey: '...', authDomain: '...', projectId: '...', messagingSenderId: '...', appId: '...', vapidKey: '...' },
  firebase: null,

  // Equipes que aparecem na tela de entrada (o PIN de cada uma fica na planilha)
  equipes: [
    { code: 'RA', bloco: 'SP', conc: 'Rodoanel' },
    { code: 'AB1', bloco: 'SP', conc: 'AutoBAn' },
    { code: 'AB2', bloco: 'SP', conc: 'AutoBAn' },
    { code: 'MD1', bloco: 'SP', conc: 'AutoBAn' },
    { code: 'SV1', bloco: 'SP', conc: 'SPVias' },
    { code: 'SV2', bloco: 'SP', conc: 'SPVias' },
    { code: 'VC1', bloco: 'Sul', conc: 'Via Costeira' },
    { code: 'VC2', bloco: 'Sul', conc: 'Via Costeira' },
    { code: 'VS1', bloco: 'Sul', conc: 'Via Sul' },
    { code: 'VS2', bloco: 'Sul', conc: 'Via Sul' },
    { code: 'VS3', bloco: 'Sul', conc: 'Via Sul' },
    { code: 'VS4', bloco: 'Sul', conc: 'Via Sul' }
  ]
};
