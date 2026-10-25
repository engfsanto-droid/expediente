/* ============================================================
   CONFIGURAÇÃO DO APP EXPEDIENTE — único arquivo para editar.
   ============================================================ */
self.CONFIG = {
  // Endereço do servidor: o link do Apps Script que termina em /exec
  servidor: 'https://script.google.com/macros/s/AKfycbyEs2iEoYT4Uz7DGop28LX22_o6TE9ZW3O7XMb2PlXxYGpn_ERIDSdYgYeqnzdeUm4N/exec',

  // Avisos no celular (Firebase). Deixe null enquanto não configurar.
  // Depois troque null pelo bloco do Firebase, por exemplo:
  // firebase: { apiKey: '...', authDomain: '...', projectId: '...', messagingSenderId: '...', appId: '...', vapidKey: '...' },
  firebase: null,firebase: {
    apiKey: 'AIzaSyBhZPtqo3Vv-G0Aw0ZCu3iXvkEvPSUbYhw',
    authDomain: 'expediente-app-910d6.firebaseapp.com',
    projectId: 'expediente-app-910d6',
    messagingSenderId: '706736779408',
    appId: '1:706736779408:web:e84ded7d72f3cb51c62815',
    vapidKey: 'BGj3lwmEV72I6ueYX2V5QFHBWLRCKru9HiG6BYkLc_8WZ_SAZIIiZdsl7YX3H6QjZNkOT7qhoLHYQVE0rG805tE'
  },

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
