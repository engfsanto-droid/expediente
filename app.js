/* App Expediente das Equipes — lógica do celular. */
(function () {
  'use strict';

  var VERSAO = '1.1';
  var C = self.CONFIG || {};
  var MALHA = self.MALHA || [];
  var CHAVE = 'app-expediente-v1';
  var DEMO = !C.servidor || /COLE_AQUI/.test(C.servidor);

  var DISC = [
    { n: 'Horizontal', c: '#2a78d6', u: '' },
    { n: 'Vertical Solo', c: '#eb6834', u: 'placas' },
    { n: 'Vertical Aérea', c: '#e87ba4', u: '' },
    { n: 'OAC', c: '#1baf7a', u: '' },
    { n: 'Drenagem Superficial', c: '#eda100', u: '' },
    { n: 'EPS', c: '#008300', u: '' },
    { n: 'Edificações', c: '#8a5a2b', u: '' }
  ];
  var ICO = {
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    back: '<path d="M15 18l-6-6 6-6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    fuel: '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M5 10h9"/><path d="M14 8h2l2 2v7a1.5 1.5 0 0 0 3 0v-6l-2-2"/>',
    cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    menu: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
    chuva: '<path d="M7 17h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 8.5 4.25 4.25 0 0 0 7 17z"/><path d="M9 20l1-2M14 20l1-2"/>',
    cco: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    carro: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    trein: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    folga: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    outro: '<path d="M6 12h.01M12 12h.01M18 12h.01" stroke-width="3"/>'
  };
  var MOTIVOS = [
    { k: 'chuva', n: 'Chuva' },
    { k: 'cco', n: 'Sem liberação do CCO', s: 'conta como chuva' },
    { k: 'carro', n: 'Carro em manutenção' },
    { k: 'trein', n: 'Treinamento ou curso' },
    { k: 'folga', n: 'Folga' },
    { k: 'outro', n: 'Outro' }
  ];
  function motivoNome(k) { var m = MOTIVOS.filter(function (x) { return x.k === k; })[0]; return m ? m.n : k; }
  function exigeFoto(k) { return k === 'chuva' || k === 'cco'; }

  /* ---------- utilitários ---------- */
  function svg(nome, tam) { return '<svg class="svg" viewBox="0 0 24 24" width="' + (tam || 22) + '" height="' + (tam || 22) + '" aria-hidden="true">' + ICO[nome] + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hm(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dur(a, b) { var m = Math.max(0, Math.round((b - a) / 60000)), h = Math.floor(m / 60); m = m % 60; return h ? h + ' h ' + pad(m) + ' min' : m + ' min'; }
  function fmt(n) { return Number(n).toLocaleString('pt-BR'); }
  function kmTxt(km) { return 'km ' + String(km).replace('.', ','); }
  function uuid() { return (self.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
  function soNum(v, max) { return String(v || '').replace(/\D/g, '').slice(0, max || 7); }
  function soDec(v) { return String(v || '').replace(/[^0-9,]/g, '').replace(/,(?=.*,)/g, '').slice(0, 8); }
  function disc(n) { return DISC.filter(function (d) { return d.n === n; })[0] || { n: n, c: '#5F707A', u: '' }; }

  /* ---------- estado ---------- */
  var S = carregar();
  var UI = { tela: '', form: {}, menu: false, ocupado: '', toast: '', semSinal: false, filaN: 0, instalar: null };

  function novoDia() { return { data: hoje(), exp: null, fim: null, hodIni: '', itens: [], diaParado: null, aviso: '' }; }
  function carregar() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { s = null; }
    s = s || {};
    s.dia = s.dia || novoDia();
    s.ultimaEquipe = s.ultimaEquipe || 'SV1';
    return s;
  }
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch (e) { /* cheio */ } }

  function virarDia() {
    var d = S.dia;
    if (d.data === hoje()) return;
    // expediente da noite ainda aberto (até 14 h depois do início) continua
    if (d.exp && !d.fim && Date.now() - d.exp.ini < 14 * 3600000) return;
    var aviso = (d.exp && !d.fim) ? 'O expediente de ' + d.data.split('-').reverse().slice(0, 2).join('/') + ' ficou aberto. A supervisão vai conferir o horário de saída.' : '';
    S.dia = novoDia();
    S.dia.aviso = aviso;
    salvar();
  }

  /* ---------- fila de envio (IndexedDB) ---------- */
  var dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (res, rej) {
      var r = indexedDB.open('app-expediente', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('fila', { keyPath: 'seq', autoIncrement: true }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbP;
  }
  function tx(modo, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction('fila', modo), st = t.objectStore('fila'), out = fn(st);
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  function filaAdd(ev) { return tx('readwrite', function (st) { return st.add({ ev: ev, tent: 0, criado: Date.now() }); }); }
  function filaTodos() { return tx('readonly', function (st) { return st.getAll(); }); }
  function filaDel(seq) { return tx('readwrite', function (st) { return st.delete(seq); }); }
  function filaPut(it) { return tx('readwrite', function (st) { return st.put(it); }); }

  function api(acao, dados) {
    var corpo = Object.assign({ acao: acao, versao: VERSAO }, S.sessao ? { equipe: S.sessao.equipe.code, token: S.sessao.token } : {}, dados || {});
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 30000);
    return fetch(C.servidor, { method: 'POST', body: JSON.stringify(corpo), signal: ctl.signal, redirect: 'follow' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .finally(function () { clearTimeout(t); });
  }

  var enviando = false;
  function enviarFila() {
    if (enviando || !S.sessao) return Promise.resolve();
    enviando = true;
    return filaTodos().then(function (itens) {
      UI.filaN = itens.length;
      if (DEMO || !itens.length) return;
      var i = 0;
      function proximo() {
        if (i >= itens.length) return;
        var it = itens[i++];
        return api('evento', { ev: it.ev }).then(function (r) {
          UI.semSinal = false;
          if (r.ok) { UI.filaN--; return filaDel(it.seq).then(proximo); }
          if (r.auth) { sessaoExpirada(); return; }
          it.tent++; it.erro = r.erro;
          if (it.tent >= 5) { UI.filaN--; guardarRejeitado(it); return filaDel(it.seq).then(proximo); }
          return filaPut(it);
        }, function () { UI.semSinal = true; });
      }
      return proximo();
    }).catch(function () { /* sem banco */ }).then(function () { enviando = false; atualizarSync(); });
  }
  function guardarRejeitado(it) {
    S.rejeitados = (S.rejeitados || []).concat([{ tipo: it.ev.tipo, quando: it.ev.ts, erro: it.erro }]).slice(-20);
    salvar();
  }
  function registrar(ev) {
    return filaAdd(ev).then(function () { UI.filaN++; atualizarSync(); enviarFila(); },
      function () { toast('Não consegui guardar no celular. Tente de novo.'); throw new Error('fila'); });
  }
  function sessaoExpirada() {
    var eq = S.sessao && S.sessao.equipe.code;
    S.sessao = null; S.ultimaEquipe = eq || S.ultimaEquipe; salvar();
    UI.form = { aviso: 'O PIN da equipe mudou. Entre de novo — o que foi lançado continua guardado e será enviado.' };
    ir('login');
  }

  /* ---------- GPS ---------- */
  var GPS = { ultimo: null, erro: '', watch: null };
  function gpsLigar() {
    if (!navigator.geolocation) { GPS.erro = 'indisponivel'; return; }
    if (GPS.watch !== null) return;
    GPS.watch = navigator.geolocation.watchPosition(function (p) {
      GPS.ultimo = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), t: Date.now() };
      GPS.erro = ''; atualizarLocal();
    }, function (e) { GPS.erro = e.code === 1 ? 'negado' : 'falhou'; atualizarLocal(); },
    { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
  }
  function gpsAgora() {
    return new Promise(function (res) {
      var u = GPS.ultimo;
      if (u && Date.now() - u.t < 30000 && u.acc <= 150) return res(u);
      if (!navigator.geolocation) return res(u || null);
      navigator.geolocation.getCurrentPosition(function (p) {
        GPS.ultimo = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), t: Date.now() };
        res(GPS.ultimo);
      }, function () { res(u && Date.now() - u.t < 300000 ? u : null); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 });
    });
  }
  function localizar(g) {
    if (!g || !MALHA.length) return null;
    var lat = g.lat, lng = g.lng, cl = Math.cos(lat * Math.PI / 180), best = null;
    for (var k = 0; k < MALHA.length; k++) {
      var t = MALHA[k], p = t.p;
      for (var i = 0; i < p.length - 1; i++) {
        var a = p[i], b = p[i + 1];
        var ax = (a[2] - lng) * cl * 111320, ay = (a[1] - lat) * 110540;
        var bx = (b[2] - lng) * cl * 111320, by = (b[1] - lat) * 110540;
        var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
        var u = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
        var px = ax + u * dx, py = ay + u * dy, d = Math.sqrt(px * px + py * py);
        if (!best || d < best.d) best = { d: d, rod: t.r, conc: t.c, km: a[0] + u * (b[0] - a[0]) };
      }
    }
    var dk = best.d / 1000;
    return { rod: best.rod, conc: best.conc, km: Math.round(best.km * 10) / 10, dist: Math.round(dk * 10) / 10,
      sit: dk <= 1 ? 'Na rodovia' : dk <= 3 ? 'Perto' : 'Fora' };
  }
  function pillClasse(sit) { return sit === 'Na rodovia' ? 'na' : sit === 'Perto' ? 'perto' : sit === 'Fora' ? 'fora' : 'sem'; }
  function distTxt(l) { return l.dist < 0.1 ? 'na pista' : 'a ' + String(l.dist).replace('.', ',') + ' km da pista'; }

  function cartaoLocal(titulo) {
    return '<div class="cartao" id="local">' + conteudoLocal(titulo) + '</div>';
  }
  function conteudoLocal(titulo) {
    var cab = '<div class="cartao-cab">' + svg('pin') + '<span>' + esc(titulo || 'Onde vocês estão agora') + '</span></div>';
    if (GPS.erro === 'negado') {
      return cab + '<div class="aviso-local"><b>A localização está bloqueada.</b> Toque no cadeado ao lado do endereço (ou em Configurações do app) e permita a localização. Sem ela, o registro vai como “Sem GPS”.</div>';
    }
    if (!GPS.ultimo) return cab + '<div class="local-rod" style="color:var(--muted)">Buscando GPS…</div><div class="linha-pill">Fique com o celular perto da janela.</div>';
    var l = localizar(GPS.ultimo);
    if (!l) return cab + '<div class="linha-pill">GPS ok (precisão ' + GPS.ultimo.acc + ' m)</div>';
    var longe = l.dist > 30;
    var txt = cab + '<div class="local-rod">' + (longe ? 'Longe das rodovias' : esc(l.rod) + ' · ' + kmTxt(l.km)) + '</div>' +
      '<div class="linha-pill"><span class="pill ' + pillClasse(l.sit) + '">' + (l.sit === 'Perto' ? 'Perto da rodovia' : l.sit === 'Fora' ? 'Fora da rodovia' : 'Na rodovia') + '</span>' +
      '<span>' + (longe ? 'mais próxima: ' + esc(l.rod) + ' · ' : '') + distTxt(l) + ' · precisão ' + GPS.ultimo.acc + ' m</span></div>';
    if (l.sit === 'Fora') txt += '<div class="aviso-local">O celular está longe da pista. Dá para registrar mesmo assim, mas a supervisão vai ver o aviso. Se estão a caminho, registre quando chegarem.</div>';
    if (l.sit === 'Perto') txt += '<div class="aviso-local">Um pouco fora da pista (acesso, base ou posto?). Pode registrar normalmente.</div>';
    return txt;
  }
  function atualizarLocal() {
    var el = document.getElementById('local');
    if (el) el.innerHTML = conteudoLocal(el.getAttribute('data-titulo'));
    var mini = document.getElementById('local-mini');
    if (mini) mini.textContent = textoMini();
  }
  function textoMini() {
    var l = localizar(GPS.ultimo);
    return l ? 'Local e hora entram sozinhos: ' + l.rod + ' ' + kmTxt(l.km) + ' · ' + hm(Date.now()) : 'Local e hora entram sozinhos (buscando GPS…)';
  }

  /* ---------- fotos ---------- */
  function comprimir(arquivo) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(arquivo), img = new Image();
      img.onload = function () {
        var max = 1280, w = img.naturalWidth, h = img.naturalHeight, f = Math.min(1, max / Math.max(w, h));
        var cv = document.createElement('canvas'); cv.width = Math.round(w * f); cv.height = Math.round(h * f);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        var dataUrl = cv.toDataURL('image/jpeg', 0.72);
        URL.revokeObjectURL(url);
        res({ b64: dataUrl.split(',')[1], mime: 'image/jpeg', previa: dataUrl, nome: arquivo.name || 'foto.jpg' });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('imagem')); };
      img.src = url;
    });
  }
  function blocoFoto(id, titulo, dica) {
    var f = UI.form.foto;
    var input = '<input id="' + id + '" type="file" accept="image/*" capture="environment" data-foto hidden>';
    if (!f) return '<label for="' + id + '" class="foto-tile">' + svg('cam', 30) + '<b>' + esc(titulo) + '</b><small>' + esc(dica) + '</small></label>' + input;
    return '<div class="foto-ok"><img src="' + f.previa + '" alt="Foto anexada"><div><b>Foto anexada</b><small>' + Math.round(f.b64.length * 0.75 / 1024) + ' KB</small></div><label for="' + id + '">Trocar</label></div>' + input;
  }

  /* ---------- telas ---------- */
  function cabecalho() {
    var e = S.sessao.equipe;
    var data = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
    return '<header class="cab"><div class="cab-esq"><div class="cab-eq">' + esc(e.code) + '</div><div class="cab-sub">' + esc(e.conc) + (e.dupla ? ' · ' + esc(e.dupla) : '') + '</div></div>' +
      '<div class="cab-dir"><div class="cab-data">' + esc(data) + '</div><button type="button" class="' + syncClasse() + '" id="sync" data-acao="sincronizar">' + syncTexto() + '</button></div>' +
      '<button type="button" class="cab-menu" aria-label="Menu" data-acao="menu">' + svg('menu', 24) + '</button></header>';
  }
  function syncClasse() { return 'sync ' + (DEMO ? 'teste' : UI.filaN === 0 ? 'ok' : UI.semSinal ? 'off' : 'fila'); }
  function syncTexto() {
    if (DEMO) return '<i></i>Modo de teste';
    if (UI.filaN === 0) return '<i></i>Tudo enviado';
    return '<i></i>' + (UI.semSinal ? 'Sem sinal · ' : 'Enviando · ') + UI.filaN + ' na fila';
  }
  function atualizarSync() {
    var b = document.getElementById('sync'); if (b) { b.className = syncClasse(); b.innerHTML = syncTexto(); }
    var f = document.getElementById('envio-fim');
    if (f && !DEMO && UI.filaN === 0) { f.style.background = 'var(--green-soft)'; f.style.color = 'var(--green)'; f.textContent = 'Enviado para a supervisão.'; }
  }

  function telaLogin() {
    var sel = UI.form.equipe || S.ultimaEquipe;
    var chips = function (bloco) {
      return '<div class="tres">' + (C.equipes || []).filter(function (e) { return e.bloco === bloco; }).map(function (e) {
        return '<button type="button" class="eq-chip" data-acao="equipe" data-v="' + esc(e.code) + '" aria-pressed="' + (e.code === sel) + '"><b>' + esc(e.code) + '</b><span>' + esc(e.conc) + '</span></button>';
      }).join('') + '</div>';
    };
    return '<div class="tela"><div class="conteudo">' +
      (DEMO ? '<div class="banner teste"><b>Modo de teste.</b> O servidor ainda não foi ligado: qualquer PIN entra e nada é enviado.</div>' : '') +
      (UI.form.aviso ? '<div class="banner alerta">' + esc(UI.form.aviso) + '</div>' : '') +
      '<div class="marca">Monitoramento · Expediente</div><h1>Bom dia! Qual é a sua equipe?</h1>' +
      '<div class="bloco-rot">Bloco SP</div>' + chips('SP') + '<div class="bloco-rot">Bloco Sul</div>' + chips('Sul') +
      '<label class="rotulo" for="pin">PIN da equipe</label>' +
      '<input class="campo pin" id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="4 números" data-campo="pin" value="' + esc(UI.form.pin || '') + '">' +
      (UI.form.erro ? '<div class="erro-txt">' + esc(UI.form.erro) + '</div>' : '') +
      (UI.instalar ? '<button type="button" class="btn-txt" style="margin-top:18px" data-acao="instalar">Instalar o app na tela inicial</button>' : '') +
      '</div><div class="rodape"><button type="button" class="btn m roxo" data-acao="entrar">Entrar como ' + esc(sel) + '</button></div></div>';
  }

  function telaInicio() {
    var f = UI.form;
    return cabecalho() + '<div class="tela"><div class="conteudo">' +
      (S.dia.aviso ? '<div class="banner alerta">' + esc(S.dia.aviso) + '</div>' : '') +
      bannerTeste() + bannerLembretes() +
      '<h2>Pronto para começar?</h2>' + '<div class="cartao" id="local" data-titulo="Onde vocês estão agora">' + conteudoLocal() + '</div>' +
      '<label class="rotulo" for="hod">Hodômetro agora (km)</label>' +
      '<input class="campo" id="hod" type="text" inputmode="numeric" placeholder="Ex.: 154805" data-campo="hod" data-num="7" value="' + esc(f.hod || '') + '">' +
      '<button type="button" class="toggle" data-acao="reserva" aria-pressed="' + !!f.reserva + '"><span class="caixa">' + (f.reserva ? '<svg class="svg" viewBox="0 0 24 24" width="16" height="16" style="stroke:#fff;stroke-width:3" aria-hidden="true">' + ICO.check + '</svg>' : '') + '</span>' +
      '<span><b>Estamos com outro carro hoje</b><small>Carro reserva ou emprestado de outra equipe</small></span></button>' +
      (f.reserva ? '<div class="reserva"><label class="rotulo" for="placa">Placa do carro de hoje</label>' +
        '<input class="campo placa" id="placa" type="text" autocapitalize="characters" placeholder="Ex.: TKK4E43" data-campo="placa" value="' + esc(f.placa || '') + '">' +
        '<label class="rotulo" for="obscarro">Observação</label><textarea class="campo" id="obscarro" rows="2" placeholder="Ex.: nosso carro está na oficina, pegamos o reserva da base" data-campo="obsCarro">' + esc(f.obsCarro || '') + '</textarea>' +
        '<p class="nota" style="margin-top:8px">O hodômetro acima deve ser o deste carro.</p></div>' : '') +
      '<p class="nota">Ao tocar em Iniciar, o app grava a hora e a localização deste momento.</p>' +
      '</div><div class="rodape"><button type="button" class="btn g verde" data-acao="iniciar">' + svg('play', 24) + 'Iniciar expediente</button>' +
      '<button type="button" class="btn-txt" data-acao="diaParado">Hoje a equipe não vai a campo</button></div></div>';
  }

  function itemHtml(it) {
    var ico, tit, sub, num = '';
    if (it.tipo === 'prod') {
      var d = disc(it.disc);
      ico = '<span class="dot" style="background:' + d.c + '"></span>'; tit = it.disc;
      sub = (it.oc ? 'OC ' + it.oc + ' · ' : '') + (it.local || '');
      num = fmt(it.qtd) + (d.u ? ' ' + d.u : '');
    } else if (it.tipo === 'parada') {
      ico = svg('pause'); tit = 'Parada · ' + (it.motivoNome || it.motivo);
      sub = (it.obs || (it.motivo === 'cco' || it.motivoNome === 'Sem liberação do CCO' ? 'conta como chuva' : 'sem observação')) + (it.foto ? ' · com foto' : '');
    } else {
      ico = svg('fuel'); tit = 'Abastecimento';
      var valor = typeof it.valor === 'number' ? it.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : it.valor;
      sub = 'R$ ' + valor + (it.hod ? ' · ' + fmt(it.hod) + ' km' : '') + ' · nota anexada';
      num = String(it.litros).replace('.', ',') + ' L';
    }
    return '<div class="item"><span class="item-ico">' + ico + '</span><div class="item-txt"><b>' + esc(tit) + '</b><small>' + esc(sub) + '</small></div>' +
      '<div class="item-num"><b>' + esc(num) + '</b><small>' + hm(it.ts) + '</small></div></div>';
  }

  function telaEmCampo() {
    var d = S.dia, e = d.exp;
    var nP = d.itens.filter(function (i) { return i.tipo === 'prod'; }).length, nPa = d.itens.filter(function (i) { return i.tipo === 'parada'; }).length;
    return cabecalho() + '<div class="tela"><div class="conteudo">' + bannerTeste() + bannerLembretes() +
      '<div class="status"><div class="status-rot">Em expediente</div><div class="status-hora">desde ' + hm(e.ini) + '</div>' +
      '<div class="status-sub" id="status-sub">há ' + dur(e.ini, Date.now()) + (e.rod ? ' · início ' + (e.sit === 'Na rodovia' ? 'na rodovia' : e.sit === 'Perto' ? 'perto da rodovia' : 'fora da rodovia') + ' (' + esc(e.rod) + ' ' + kmTxt(e.km) + ')' : ' · início sem GPS') + '</div>' +
      (e.placa ? '<div class="status-res">Carro reserva hoje · ' + esc(e.placa) + '</div>' : '') + '</div>' +
      '<div class="lista-cab"><h3>Hoje</h3><span>' + nP + (nP === 1 ? ' lançamento' : ' lançamentos') + (nPa ? ' · ' + nPa + (nPa === 1 ? ' parada' : ' paradas') : '') + '</span></div>' +
      (d.itens.length ? d.itens.slice().reverse().map(itemHtml).join('') : '<div class="vazio">Nenhuma produção lançada ainda. Use “Lançar produção” sempre que fechar um trecho.</div>') +
      '</div><div class="rodape"><button type="button" class="btn m roxo" data-acao="irProducao">' + svg('plus', 24) + 'Lançar produção</button>' +
      '<div class="tres"><button type="button" class="btn-sec" data-acao="irAbast">Abastecer</button><button type="button" class="btn-sec" data-acao="irParada">Parada</button><button type="button" class="btn-sec perigo" data-acao="irEncerrar">Encerrar</button></div></div></div>';
  }

  function telaProducao() {
    var f = UI.form, sel = f.disc || 'Vertical Solo', d = disc(sel);
    return cabecalho() + '<div class="tela"><div class="conteudo" style="padding-top:12px">' + voltar() + '<h2>Lançar produção</h2>' +
      '<span class="rotulo">Disciplina</span><div class="duas">' + DISC.map(function (x) {
        return '<button type="button" class="disc" data-acao="disc" data-v="' + esc(x.n) + '" aria-pressed="' + (x.n === sel) + '"><span class="dot" style="background:' + x.c + '"></span>' + esc(x.n) + '</button>';
      }).join('') + '</div>' +
      '<label class="rotulo" for="qtd">Quantidade' + (d.u ? ' (' + d.u + ')' : '') + '</label>' +
      '<div class="stepper"><button type="button" aria-label="Diminuir" data-acao="menos">' + svg('minus', 26) + '</button>' +
      '<input class="campo grande" id="qtd" type="text" inputmode="numeric" placeholder="0" data-campo="qtd" data-num="5" value="' + esc(f.qtd || '') + '">' +
      '<button type="button" aria-label="Aumentar" data-acao="mais">' + svg('plus', 26) + '</button></div>' +
      '<label class="rotulo" for="oc">OC (nº de liberação)</label><input class="campo" id="oc" type="text" inputmode="numeric" placeholder="Ex.: 93" data-campo="oc" value="' + esc(f.oc || '') + '">' +
      '<div class="auto">' + svg('pin', 18) + '<span id="local-mini">' + esc(textoMini()) + '</span></div>' +
      '</div><div class="rodape"><button type="button" class="btn m roxo" data-acao="salvarProducao">Salvar produção</button></div></div>';
  }

  function telaParada() {
    var f = UI.form, mot = f.motivo || 'chuva', dia = !S.dia.exp;
    var ex = exigeFoto(mot);
    var titulo = ex ? 'Tirar foto da pista' : mot === 'outro' ? 'Anexar foto do ocorrido' : 'Anexar foto';
    var dica = ex ? 'mostra a condição do tempo no local' : mot === 'outro' ? 'sinistro, avaria, pista bloqueada…' : mot === 'carro' ? 'painel, pneu, avaria no carro…' : 'se ajudar a explicar a parada';
    return cabecalho() + '<div class="tela"><div class="conteudo" style="padding-top:12px">' + voltar() +
      '<h2 style="margin-bottom:4px">' + (dia ? 'Dia sem campo' : 'Registrar parada') + '</h2>' +
      '<p class="nota" style="margin:0 0 16px">' + (dia ? 'O dia fica registrado como parado, sem precisar iniciar expediente.' : 'Pausa no meio do expediente. Depois é só continuar lançando.') + '</p>' +
      '<div class="duas">' + MOTIVOS.map(function (m) {
        return '<button type="button" class="mot" data-acao="motivo" data-v="' + m.k + '" aria-pressed="' + (m.k === mot) + '">' + svg(m.k, 28) + '<b>' + esc(m.n) + '</b>' + (m.s ? '<small>' + esc(m.s) + '</small>' : '') + '</button>';
      }).join('') + '</div>' +
      '<span class="rotulo">Foto ' + (ex ? '(obrigatória para chuva)' : '(opcional)') + '</span>' + blocoFoto('fotoParada', titulo, dica) +
      '<label class="rotulo" for="obs">Observação (opcional)</label><textarea class="campo" id="obs" rows="3" placeholder="Ex.: chuva forte desde 13h, sem condição de pista" data-campo="obs">' + esc(f.obs || '') + '</textarea>' +
      '</div><div class="rodape"><button type="button" class="btn m escuro" data-acao="salvarParada">' + (dia ? 'Registrar dia parado' : 'Registrar parada') + '</button></div></div>';
  }

  function telaAbast() {
    var f = UI.form;
    return cabecalho() + '<div class="tela"><div class="conteudo" style="padding-top:12px">' + voltar() + '<h2>Abastecimento</h2>' +
      '<span class="rotulo">Foto da nota fiscal (obrigatória)</span>' + blocoFoto('fotoNota', 'Tirar foto da nota', 'a nota inteira, com o valor legível') +
      '<div class="duas" style="margin-top:4px"><div><label class="rotulo" for="litros">Litros</label><input class="campo" id="litros" type="text" inputmode="decimal" placeholder="Ex.: 38,5" data-campo="litros" data-dec value="' + esc(f.litros || '') + '"></div>' +
      '<div><label class="rotulo" for="valor">Valor (R$)</label><input class="campo" id="valor" type="text" inputmode="decimal" placeholder="Ex.: 231,00" data-campo="valor" data-dec value="' + esc(f.valor || '') + '"></div></div>' +
      '<label class="rotulo" for="abhod">Hodômetro na bomba (km)</label><input class="campo" id="abhod" type="text" inputmode="numeric" placeholder="Ex.: 154890" data-campo="hod" data-num="7" value="' + esc(f.hod || '') + '">' +
      '<div class="auto">' + svg('pin', 18) + '<span id="local-mini">' + esc(textoMini()) + '</span></div>' +
      '</div><div class="rodape"><button type="button" class="btn m escuro" data-acao="salvarAbast">Salvar abastecimento</button></div></div>';
  }

  function totais() {
    var t = {};
    S.dia.itens.forEach(function (i) { if (i.tipo === 'prod') t[i.disc] = (t[i.disc] || 0) + Number(i.qtd); });
    return Object.keys(t).map(function (k) { var d = disc(k); return { n: k, c: d.c, v: fmt(t[k]) + (d.u ? ' ' + d.u : '') }; });
  }

  function telaEncerrar() {
    var e = S.dia.exp, f = UI.form, tt = totais();
    return cabecalho() + '<div class="tela"><div class="conteudo" style="padding-top:12px">' + voltar() + '<h2>Encerrar expediente</h2>' +
      '<div class="trio"><div><small>Início</small><b>' + hm(e.ini) + '</b></div><div><small>Fim (agora)</small><b>' + hm(Date.now()) + '</b></div><div><small>Duração</small><b style="font-size:20px">' + dur(e.ini, Date.now()) + '</b></div></div>' +
      '<div style="margin-top:14px">' + '<div class="cartao" id="local" data-titulo="Saída: onde vocês estão">' + conteudoLocal('Saída: onde vocês estão') + '</div></div>' +
      '<h3>Produção do dia</h3>' +
      (tt.length ? tt.map(function (t) { return '<div class="tot"><span class="dot" style="background:' + t.c + '"></span><span>' + esc(t.n) + '</span><b>' + esc(t.v) + '</b></div>'; }).join('')
        : '<div class="vazio">Nenhuma produção lançada. Se a equipe produziu, volte e lance antes de encerrar.</div>') +
      '<label class="rotulo" for="hodf">Hodômetro na chegada (km)</label><input class="campo" id="hodf" type="text" inputmode="numeric" placeholder="Ex.: 154912" data-campo="hodFim" data-num="7" value="' + esc(f.hodFim || '') + '">' +
      '</div><div class="rodape"><button type="button" class="btn m vermelho" data-acao="encerrar">' + svg('stop', 22) + 'Confirmar e encerrar</button></div></div>';
  }

  function telaFim() {
    var d = S.dia, tt = totais(), titulo, linha, prod;
    if (d.diaParado) {
      titulo = 'Dia registrado como parado';
      linha = motivoNome(d.diaParado.motivo) + (d.diaParado.motivo === 'cco' ? ' (conta como chuva)' : '') + ' · ' + hm(d.diaParado.ts);
      prod = 'Bom descanso, equipe ' + S.sessao.equipe.code + '.';
    } else {
      titulo = 'Expediente encerrado';
      linha = hm(d.exp.ini) + ' – ' + hm(d.fim) + ' · ' + dur(d.exp.ini, d.fim);
      prod = tt.length ? tt.map(function (t) { return t.n + ' ' + t.v; }).join(' · ') : 'Sem produção lançada hoje.';
    }
    var envio = DEMO ? ['var(--rule-soft)', 'var(--ink)', 'Modo de teste: nada foi enviado.'] :
      UI.filaN ? ['var(--amber-soft)', 'var(--amber-ink)', 'Salvo no celular. Envia sozinho quando tiver sinal.'] :
      ['var(--green-soft)', 'var(--green)', 'Enviado para a supervisão.'];
    return cabecalho() + '<div class="tela"><div class="conteudo"><div class="fim"><div class="check">' + svg('check', 44) + '</div>' +
      '<h2>' + esc(titulo) + '</h2><p style="font-size:17px">' + esc(linha) + '</p><p style="color:var(--muted);font-size:15px">' + esc(prod) + '</p>' +
      '<div class="envio" id="envio-fim" style="background:' + envio[0] + ';color:' + envio[1] + '">' + envio[2] + '</div>' +
      '<p class="nota" style="margin-top:22px">Amanhã o app abre pronto para um novo dia.</p></div></div></div>';
  }

  function voltar() { return '<button type="button" class="voltar" data-acao="voltar">' + svg('back', 20) + 'Voltar</button>'; }
  function bannerTeste() { return DEMO ? '<div class="banner teste"><b>Modo de teste.</b> Nada é enviado para a planilha.</div>' : ''; }

  /* ---------- lembretes (Firebase) ---------- */
  var FB = null;
  function lembretesDisponiveis() { return !!(C.firebase && C.firebase.apiKey && 'Notification' in self && 'serviceWorker' in navigator && !DEMO); }
  function bannerLembretes() {
    if (!lembretesDisponiveis() || Notification.permission === 'granted' || S.lembretesNao) return '';
    return '<div class="banner alerta" style="display:flex;gap:10px;align-items:center"><span style="flex:1"><b>Ative os lembretes</b> para receber um aviso se esquecer de iniciar ou encerrar.</span>' +
      '<button type="button" class="btn-sec" style="width:auto;padding:0 14px;height:44px" data-acao="lembretes">Ativar</button></div>';
  }
  function carregarScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  function firebasePronto() {
    if (FB) return FB;
    var base = 'https://www.gstatic.com/firebasejs/10.12.2/';
    FB = carregarScript(base + 'firebase-app-compat.js').then(function () { return carregarScript(base + 'firebase-messaging-compat.js'); })
      .then(function () {
        if (!firebase.apps.length) firebase.initializeApp(C.firebase);
        var m = firebase.messaging();
        m.onMessage(function (p) { var n = p.notification || {}; toast((n.title ? n.title + ' — ' : '') + (n.body || '')); });
        return m;
      });
    return FB;
  }
  function ativarLembretes(silencioso) {
    if (!lembretesDisponiveis()) { if (!silencioso) toast('Lembretes ainda não configurados.'); return Promise.resolve(); }
    var perm = silencioso ? Promise.resolve(Notification.permission) : Notification.requestPermission();
    return perm.then(function (p) {
      if (p !== 'granted') { if (!silencioso) toast('Sem permissão para avisos. Dá para liberar nas configurações do Chrome.'); return; }
      return Promise.all([firebasePronto(), navigator.serviceWorker.ready]).then(function (r) {
        return r[0].getToken({ vapidKey: C.firebase.vapidKey, serviceWorkerRegistration: r[1] });
      }).then(function (token) {
        if (!token || token === S.fcmToken) return;
        return api('token', { fcm: token }).then(function (res) { if (res.ok) { S.fcmToken = token; salvar(); if (!silencioso) toast('Lembretes ativados.'); } });
      });
    }).catch(function () { if (!silencioso) toast('Não consegui ativar os lembretes agora.'); }).then(function () { if (!silencioso) render(); });
  }

  /* ---------- navegação ---------- */
  function telaAtual() {
    if (!S.sessao) return 'login';
    if (S.dia.diaParado || S.dia.fim) return 'fim';
    return S.dia.exp ? 'emcampo' : 'inicio';
  }
  function ir(t) { UI.tela = t; render(); var c = document.querySelector('.conteudo'); if (c) c.scrollTop = 0; }
  function voltarPrincipal() { UI.form = {}; ir(telaAtual()); }

  function render() {
    var t = UI.tela || telaAtual();
    var html = ({ login: telaLogin, inicio: telaInicio, emcampo: telaEmCampo, producao: telaProducao, parada: telaParada,
      abast: telaAbast, encerrar: telaEncerrar, fim: telaFim })[t]();
    if (UI.menu) html += menuHtml();
    if (UI.ocupado) html += '<div class="ocupado" role="status"><div>' + esc(UI.ocupado) + '</div></div>';
    if (UI.toast) html += '<div class="toast" role="status">' + esc(UI.toast) + '</div>';
    document.getElementById('app').innerHTML = html;
    if (['inicio', 'producao', 'parada', 'abast', 'encerrar'].indexOf(t) >= 0) gpsLigar();
  }

  function menuHtml() {
    return '<div class="veu" data-acao="fecharMenu"><div class="folha" role="dialog" aria-label="Menu">' +
      '<h3>' + esc(S.sessao.equipe.code) + ' · menu</h3><p>App Expediente ' + VERSAO + (DEMO ? ' · modo de teste' : '') + '</p>' +
      '<button type="button" class="btn-sec" data-acao="sincronizar">Enviar o que está na fila agora</button>' +
      (lembretesDisponiveis() ? '<button type="button" class="btn-sec" data-acao="lembretes">' + (Notification.permission === 'granted' ? 'Reativar lembretes' : 'Ativar lembretes') + '</button>' : '') +
      (UI.instalar ? '<button type="button" class="btn-sec" data-acao="instalar">Instalar o app na tela inicial</button>' : '') +
      ((S.rejeitados || []).length ? '<p>' + S.rejeitados.length + ' registro(s) não foram aceitos pelo servidor. Avise a supervisão.</p>' : '') +
      '<button type="button" class="btn-sec perigo" data-acao="sair">Trocar de equipe</button>' +
      '<button type="button" class="btn-txt" data-acao="fecharMenu">Fechar</button></div></div>';
  }

  var tToast = null;
  function toast(t) {
    UI.toast = t; clearTimeout(tToast);
    var el = document.querySelector('.toast');
    if (el) el.textContent = t; else { var d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = t; document.getElementById('app').appendChild(d); }
    tToast = setTimeout(function () { UI.toast = ''; var x = document.querySelector('.toast'); if (x) x.remove(); }, 2800);
  }
  function ocupado(t) { UI.ocupado = t; render(); }

  function lerForm() {
    document.querySelectorAll('[data-campo]').forEach(function (el) { UI.form[el.getAttribute('data-campo')] = el.value; });
  }

  /* ---------- ações ---------- */
  function baseEv(tipo) {
    return gpsAgora().then(function (g) {
      var l = localizar(g);
      return { tipo: tipo, id: uuid(), ts: Date.now(), gps: g ? { lat: +g.lat.toFixed(6), lng: +g.lng.toFixed(6), acc: g.acc } : null,
        local: l ? { rod: l.rod, km: l.km, dist: l.dist, sit: l.sit } : { sit: 'Sem GPS' } };
    });
  }
  function textoLocal(ev) { return ev.local && ev.local.rod ? ev.local.rod + ' ' + kmTxt(ev.local.km) : 'sem GPS'; }

  var ACOES = {
    equipe: function (el) { lerForm(); UI.form.equipe = el.getAttribute('data-v'); UI.form.erro = ''; render(); },
    entrar: function () {
      lerForm();
      var code = UI.form.equipe || S.ultimaEquipe, pin = String(UI.form.pin || '');
      if (!/^\d{4}$/.test(pin)) { UI.form.erro = 'Digite os 4 números do PIN.'; return render(); }
      var info = (C.equipes || []).filter(function (e) { return e.code === code; })[0] || { code: code, conc: '' };
      if (DEMO) { entrou({ equipe: { code: code, conc: info.conc, bloco: info.bloco, dupla: '' }, token: 'teste' }, null); return; }
      ocupado('Entrando…');
      S.sessao = null;
      api('login', { equipe: code, pin: pin }).then(function (r) {
        UI.ocupado = '';
        if (!r.ok) { UI.form.erro = r.erro || 'Não deu certo.'; return render(); }
        entrou({ equipe: r.equipe, token: r.token }, r.estado);
      }, function () { UI.ocupado = ''; UI.form.erro = 'Sem internet agora. Para entrar a primeira vez precisa de sinal.'; render(); });
    },
    reserva: function () { lerForm(); UI.form.reserva = !UI.form.reserva; render(); },
    iniciar: function () {
      lerForm();
      var f = UI.form;
      if (!f.hod) { toast('Informe o hodômetro antes de iniciar.'); return; }
      if (f.reserva && !String(f.placa || '').trim()) { toast('Informe a placa do carro de hoje.'); return; }
      ocupado('Pegando a localização…');
      baseEv('inicio').then(function (ev) {
        ev.hod = Number(soNum(f.hod));
        if (f.reserva) ev.reserva = { placa: String(f.placa).toUpperCase().replace(/[^A-Z0-9]/g, ''), obs: String(f.obsCarro || '').trim() };
        return registrar(ev).then(function () {
          S.dia.exp = { id: ev.id, ini: ev.ts, rod: ev.local.rod || '', km: ev.local.km, sit: ev.local.sit, placa: ev.reserva ? ev.reserva.placa : '' };
          S.dia.hodIni = ev.hod; S.dia.aviso = ''; salvar();
          UI.ocupado = ''; UI.form = {}; ir('emcampo');
          toast('Início gravado às ' + hm(ev.ts) + (ev.local.rod ? ' · ' + ev.local.sit.toLowerCase() : ' · sem GPS'));
        });
      }).catch(function () { UI.ocupado = ''; render(); });
    },
    diaParado: function () { UI.form = { motivo: 'chuva' }; ir('parada'); },
    irProducao: function () { UI.form = { disc: S.ultimaDisc || 'Vertical Solo' }; ir('producao'); },
    irParada: function () { UI.form = { motivo: 'chuva' }; ir('parada'); },
    irAbast: function () { UI.form = {}; ir('abast'); },
    irEncerrar: function () { UI.form = {}; ir('encerrar'); },
    voltar: function () { voltarPrincipal(); },
    disc: function (el) { lerForm(); UI.form.disc = el.getAttribute('data-v'); render(); },
    mais: function () { lerForm(); UI.form.qtd = String((parseInt(UI.form.qtd, 10) || 0) + 1); var q = document.getElementById('qtd'); if (q) q.value = UI.form.qtd; },
    menos: function () { lerForm(); UI.form.qtd = String(Math.max(0, (parseInt(UI.form.qtd, 10) || 0) - 1)); var q = document.getElementById('qtd'); if (q) q.value = UI.form.qtd; },
    salvarProducao: function () {
      lerForm();
      var f = UI.form, q = parseInt(f.qtd, 10);
      if (!q || q <= 0) { toast('Informe a quantidade.'); return; }
      var dsc = f.disc || 'Vertical Solo';
      ocupado('Salvando…');
      baseEv('producao').then(function (ev) {
        ev.exp = S.dia.exp.id; ev.disc = dsc; ev.qtd = q; ev.oc = String(f.oc || '').trim();
        return registrar(ev).then(function () {
          S.dia.itens.push({ tipo: 'prod', id: ev.id, ts: ev.ts, disc: dsc, qtd: q, oc: ev.oc, local: textoLocal(ev) });
          S.ultimaDisc = dsc; salvar(); UI.ocupado = ''; voltarPrincipal();
          toast(DEMO ? 'Produção salva (teste)' : 'Produção salva');
        });
      }).catch(function () { UI.ocupado = ''; render(); });
    },
    motivo: function (el) { lerForm(); UI.form.motivo = el.getAttribute('data-v'); render(); },
    salvarParada: function () {
      lerForm();
      var f = UI.form, mot = f.motivo || 'chuva', dia = !S.dia.exp;
      if (exigeFoto(mot) && !f.foto) { toast('Tire a foto da pista para registrar a chuva.'); return; }
      ocupado('Salvando…');
      baseEv('parada').then(function (ev) {
        ev.exp = dia ? null : S.dia.exp.id; ev.motivo = mot; ev.obs = String(f.obs || '').trim(); ev.diaInteiro = dia;
        if (f.foto) ev.foto = { b64: f.foto.b64, mime: f.foto.mime };
        return registrar(ev).then(function () {
          if (dia) S.dia.diaParado = { motivo: mot, ts: ev.ts };
          else S.dia.itens.push({ tipo: 'parada', id: ev.id, ts: ev.ts, motivo: mot, motivoNome: motivoNome(mot), obs: ev.obs, foto: !!f.foto });
          salvar(); UI.ocupado = ''; voltarPrincipal();
          if (!dia) toast('Parada registrada');
        });
      }).catch(function () { UI.ocupado = ''; render(); });
    },
    salvarAbast: function () {
      lerForm();
      var f = UI.form;
      if (!f.foto) { toast('Tire a foto da nota antes de salvar.'); return; }
      if (!f.litros || !f.valor) { toast('Informe litros e valor.'); return; }
      ocupado('Salvando…');
      baseEv('abast').then(function (ev) {
        ev.exp = S.dia.exp ? S.dia.exp.id : null; ev.litros = soDec(f.litros); ev.valor = soDec(f.valor);
        ev.hod = f.hod ? Number(soNum(f.hod)) : ''; ev.placa = S.dia.exp ? S.dia.exp.placa : '';
        ev.foto = { b64: f.foto.b64, mime: f.foto.mime };
        return registrar(ev).then(function () {
          S.dia.itens.push({ tipo: 'abast', id: ev.id, ts: ev.ts, litros: ev.litros, valor: ev.valor, hod: ev.hod });
          salvar(); UI.ocupado = ''; voltarPrincipal();
          toast(UI.semSinal ? 'Salvo no celular · a foto sobe quando tiver sinal' : 'Abastecimento salvo');
        });
      }).catch(function () { UI.ocupado = ''; render(); });
    },
    encerrar: function () {
      lerForm();
      var f = UI.form;
      if (!f.hodFim) { toast('Informe o hodômetro na chegada.'); return; }
      var hf = Number(soNum(f.hodFim)), hi = Number(S.dia.hodIni || 0);
      if (hi && hf < hi && !confirm('O hodômetro da chegada (' + fmt(hf) + ') é menor que o do início (' + fmt(hi) + '). Está certo?')) return;
      if (hi && hf - hi > 800 && !confirm('Foram ' + fmt(hf - hi) + ' km hoje. Está certo?')) return;
      ocupado('Pegando a localização…');
      baseEv('fim').then(function (ev) {
        ev.exp = S.dia.exp.id; ev.hod = hf;
        return registrar(ev).then(function () { S.dia.fim = ev.ts; salvar(); UI.ocupado = ''; UI.form = {}; ir('fim'); });
      }).catch(function () { UI.ocupado = ''; render(); });
    },
    sincronizar: function () { UI.menu = false; render(); if (DEMO) { toast('Modo de teste: nada é enviado.'); return; } toast('Enviando…'); enviarFila().then(function () { toast(UI.filaN ? 'Ainda sem sinal. Tento de novo sozinho.' : 'Tudo enviado.'); }); },
    menu: function () { lerForm(); UI.menu = true; render(); },
    fecharMenu: function (el, ev) { if (ev && ev.target.closest('.folha') && !ev.target.closest('[data-acao="fecharMenu"].btn-txt')) return; UI.menu = false; render(); },
    lembretes: function () { UI.menu = false; ativarLembretes(false); },
    instalar: function () { UI.menu = false; var p = UI.instalar; if (p) { p.prompt(); p.userChoice.finally(function () { UI.instalar = null; render(); }); } },
    sair: function () {
      var aberto = S.dia.exp && !S.dia.fim;
      if (!confirm(aberto ? 'O expediente está aberto. Trocar de equipe mesmo assim? O que foi lançado continua guardado.' : 'Trocar de equipe neste celular?')) return;
      S.ultimaEquipe = S.sessao.equipe.code; S.sessao = null; S.dia = novoDia(); S.fcmToken = null; salvar();
      UI.menu = false; UI.form = {}; ir('login');
    }
  };

  function entrou(sessao, estado) {
    S.sessao = sessao; S.ultimaEquipe = sessao.equipe.code;
    var mesmoDia = S.dia && S.dia.data === hoje();
    if (estado) {
      var d = novoDia();
      if (estado.exp) {
        d.exp = { id: estado.exp.id, ini: estado.exp.ini, rod: estado.exp.rod || '', km: estado.exp.km, sit: estado.exp.sit, placa: estado.exp.placa || '' };
        d.fim = estado.exp.fim || null;
      }
      (estado.itens || []).forEach(function (i) {
        if (i.tipo === 'parada' && i.diaInteiro) { d.diaParado = { motivo: chaveMotivo(i.motivo), ts: i.ts }; return; }
        if (i.tipo === 'parada') i.motivoNome = i.motivo;
        d.itens.push(i);
      });
      // mantém o que ainda está só no celular
      if (mesmoDia && S.dia.exp && (!d.exp || d.exp.id === S.dia.exp.id)) {
        var ids = {}; d.itens.forEach(function (i) { ids[i.id] = 1; });
        S.dia.itens.forEach(function (i) { if (!ids[i.id]) d.itens.push(i); });
        d.exp = d.exp || S.dia.exp; d.fim = d.fim || S.dia.fim; d.hodIni = S.dia.hodIni;
        d.itens.sort(function (a, b) { return a.ts - b.ts; });
      }
      S.dia = d;
    } else if (!mesmoDia) {
      S.dia = novoDia();
    }
    salvar(); UI.form = {}; ir(telaAtual());
    enviarFila();
    if (lembretesDisponiveis() && Notification.permission === 'granted') ativarLembretes(true);
  }
  function chaveMotivo(nome) { var m = MOTIVOS.filter(function (x) { return x.n === nome; })[0]; return m ? m.k : 'outro'; }

  /* ---------- eventos da página ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-acao]');
    if (!el) return;
    var a = el.getAttribute('data-acao');
    if (ACOES[a]) { ACOES[a](el, ev); }
  });
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el.hasAttribute('data-num')) { var v = soNum(el.value, Number(el.getAttribute('data-num'))); if (v !== el.value) el.value = v; }
    if (el.hasAttribute('data-dec')) { var w = soDec(el.value); if (w !== el.value) el.value = w; }
    if (el.id === 'pin') { var p = soNum(el.value, 4); if (p !== el.value) el.value = p; }
    if (el.id === 'placa') { var q = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7); if (q !== el.value) el.value = q; }
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (!el.hasAttribute('data-foto') || !el.files || !el.files[0]) return;
    lerForm(); ocupado('Preparando a foto…');
    comprimir(el.files[0]).then(function (f) { UI.form.foto = f; UI.ocupado = ''; render(); },
      function () { UI.ocupado = ''; render(); toast('Não consegui ler essa foto. Tente de novo.'); });
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target.id === 'pin') ACOES.entrar();
  });
  self.addEventListener('online', function () { enviarFila(); });
  self.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); UI.instalar = e; if (UI.tela === 'login' || !UI.tela) render(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    virarDia();
    if (!UI.tela || ['inicio', 'emcampo', 'fim'].indexOf(UI.tela) >= 0) { UI.tela = ''; render(); }
    enviarFila();
  });
  setInterval(function () {
    enviarFila();
    var s = document.getElementById('status-sub');
    if (s && S.dia.exp) s.textContent = s.textContent.replace(/^há [^·]+/, 'há ' + dur(S.dia.exp.ini, Date.now()) + ' ');
  }, 60000);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () { /* sem offline */ });
  }

  /* ---------- início ---------- */
  virarDia();
  UI.tela = '';
  filaTodos().then(function (i) { UI.filaN = i.length; atualizarSync(); }).catch(function () {});
  render();
  enviarFila();
  if (S.sessao && lembretesDisponiveis() && Notification.permission === 'granted') ativarLembretes(true);

  // para testes automáticos
  self.__app = { S: S, UI: UI, localizar: localizar, GPS: GPS };
})();
