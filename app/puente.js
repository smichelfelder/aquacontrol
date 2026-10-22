// Puente entre la central (ESPHome) y las pantallas del diseño.
// build_app.py lo pega al final de la app, después de window.AQ_DATOS.
//
// Dos formas de conectarse:
//  - En casa (la página la sirve la central): lee /events de la central.
//  - En la nube (página https): se conecta a EMQX Cloud por MQTT; la central publica ahí.
(() => {
  const D = window.AQ_DATOS;

  // http://aquacontrol.local/?esphome abre la página de siempre de ESPHome
  if (location.search.includes('esphome')) {
    const s = document.createElement('script');
    s.src = 'https://oi.esphome.io/v3/www.js';
    document.body.appendChild(s);
    return;
  }

  const NUBE = location.protocol === 'https:' || location.search.includes('nube');
  const CLAVE = 'aquacontrol.v1';
  const CLAVE_MQTT = 'aquacontrol.mqtt';
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };

  /* ---------- Datos de la central ---------- */
  // Nombre de cada entidad en aquacontrol.yaml → clave que usan las pantallas
  const MAPA = {
    'sensor/Temperatura': 'temp',
    'sensor/pH': 'ph',
    'sensor/TDS': 'tds',
    'sensor/Batería': 'bateria',
    'binary_sensor/Agua en nivel bajo': 'nivelBajo',
    'binary_sensor/Agua en nivel crítico': 'nivelCritico',
    'binary_sensor/Corriente de red': 'corriente'
  };
  const GUARDAR = ['peces', 'mias', 'plan', 'largo', 'ancho', 'alto', 'abono', 'filtro', 'comida', 'sel', 'selP'];
  const subs = new Set();
  const avisar = () => subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
  const vistos = new Set();
  let guardado = '';
  let enviar = () => Promise.resolve(false);  // cada forma de conexión pone la suya

  const AQ = window.AQ = {
    v: {},
    conectado: false,
    ultimo: 0,  // cuándo llegó el último dato de la central
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    tiene(id) { return vistos.has(id); },
    press(id) { return vistos.has(id) ? enviar(id) : Promise.resolve(false); },
    cargar() { return leer(CLAVE) || {}; },
    guardar(st) {
      const o = {};
      GUARDAR.forEach((k) => { o[k] = st[k]; });
      const txt = JSON.stringify(o);
      if (txt === guardado) return;
      guardado = txt;
      escribir(CLAVE, o);
    }
  };
  window.AQ_FOTOS = D.fotos;

  const poner = (id, valor) => {
    vistos.add(id);
    AQ.ultimo = Date.now();
    const k = MAPA[id];
    if (!k) return;
    const val = typeof valor === 'number' && !isFinite(valor) ? null : valor;
    AQ.v = Object.assign({}, AQ.v, { [k]: val ?? null });
    avisar();
  };

  // En casa: eventos de la central
  const conectarLocal = () => {
    const es = new EventSource('/events');
    es.addEventListener('state', (e) => {
      let d;
      try { d = JSON.parse(e.data); } catch (err) { return; }
      if (d && d.id) { AQ.conectado = true; poner(d.id, d.value); }
    });
    // La central manda un «ping» cada pocos segundos: si dejan de llegar, no hay conexión
    es.addEventListener('ping', () => { AQ.ultimo = Date.now(); });
    es.onopen = () => { AQ.ultimo = Date.now(); avisar(); };
    enviar = (id) => {
      const url = '/' + id.split('/').map(encodeURIComponent).join('/') + '/press';
      return fetch(url, { method: 'POST' }).then((r) => r.ok).catch(() => false);
    };
    setInterval(() => { AQ.conectado = Date.now() - AQ.ultimo < 60000; avisar(); }, 5000);
  };

  // En la nube: MQTT. La central anuncia cada sonda y botón en homeassistant/…/config
  // (discovery) con su tema de estado y de orden; así no hay que repetir nombres acá.
  const conectarNube = (cfg, alFallar) => {
    const temas = {};      // tema de estado → id ('sensor/Temperatura')
    const ordenes = {};    // id → tema de orden
    let enLinea = false;   // la central dice «online»
    // Puerto de MQTT por websocket seguro: HiveMQ Cloud usa 8884; EMQX y el resto, 8084
    const puerto = /hivemq\.(cloud|com)$/.test(cfg.servidor) ? 8884 : 8084;
    const cli = window.mqtt.connect('wss://' + cfg.servidor + ':' + puerto + '/mqtt', {
      username: cfg.usuario, password: cfg.clave,
      clientId: 'app-' + Math.random().toString(16).slice(2, 10),
      reconnectPeriod: 5000, connectTimeout: 15000
    });
    const estado = () => { AQ.conectado = cli.connected && enLinea; avisar(); };
    cli.on('connect', () => {
      cli.subscribe(['homeassistant/+/aquacontrol/+/config', 'aquacontrol/status']);
      estado();
    });
    cli.on('close', estado);
    cli.on('error', (err) => {
      // 4/5 (MQTT 3) o 134/135 (MQTT 5): usuario o contraseña incorrectos
      if ([4, 5, 134, 135].includes(err && err.code)) { cli.end(true); alFallar('Usuario o contraseña incorrectos.'); }
    });
    cli.on('message', (tema, buf) => {
      const txt = buf.toString();
      if (tema === 'aquacontrol/status') { enLinea = txt === 'online'; estado(); return; }
      if (tema.endsWith('/config')) {
        let c;
        try { c = JSON.parse(txt); } catch (e) { return; }
        const base = c['~'] || '';
        const t = (s) => (s && s.startsWith('~') ? base + s.slice(1) : s);
        const id = tema.split('/')[1] + '/' + (c.name || c.object_id || '');
        vistos.add(id);
        const st = t(c.stat_t || c.state_topic), cmd = t(c.cmd_t || c.command_topic);
        if (cmd) ordenes[id] = cmd;
        if (st && !temas[st]) { temas[st] = id; cli.subscribe(st); }
        avisar();
        return;
      }
      const id = temas[tema];
      if (!id) return;
      if (txt === 'ON' || txt === 'OFF') poner(id, txt === 'ON');
      else { const n = parseFloat(txt); poner(id, isFinite(n) ? n : null); }
    });
    enviar = (id) => {
      if (!ordenes[id] || !cli.connected) return Promise.resolve(false);
      cli.publish(ordenes[id], 'PRESS');
      return Promise.resolve(true);
    };
  };

  // Pantalla de ingreso (solo en la nube, la primera vez o si la clave falla)
  const pedirClave = (msg) => {
    const prev = leer(CLAVE_MQTT) || {};
    // Solo se cambia el body: el head conserva el manifest y los íconos para poder instalar la app
    const estilo = document.createElement('style');
    estilo.textContent = 'html,body{margin:0;min-height:100%;background:#0b1d20;color:#e8f1ef;font:16px/1.4 system-ui,sans-serif}'
      + 'form{max-width:360px;margin:0 auto;padding:12vh 24px 24px;display:flex;flex-direction:column;gap:14px}'
      + 'h1{font-weight:500;font-size:28px;margin:0 0 4px}h1 b{color:#7fd6b4;font-weight:600}p{margin:0;color:#a7c0bb;font-size:14px}'
      + 'label{display:flex;flex-direction:column;gap:6px;font-size:14px;color:#a7c0bb}'
      + 'input{font:inherit;color:#e8f1ef;background:rgba(9,24,26,.7);border:1px solid rgba(170,225,212,.25);border-radius:14px;padding:14px}'
      + 'button{font:inherit;font-weight:600;border:0;border-radius:26px;padding:14px;background:#7fd6b4;color:#062018;margin-top:6px}'
      + '.err{color:#f29a9a}';
    document.head.appendChild(estilo);
    document.body.innerHTML = '<form>'
      + '<h1>Aqua<b>Control</b></h1><p>Datos de tu servidor MQTT (EMQX Cloud). Se piden una sola vez en este dispositivo.</p>'
      + (msg ? '<p class="err"></p>' : '')
      + '<label>Servidor<input name="servidor" required autocomplete="off" placeholder="xxxx.ala.eu-central-1.emqxsl.com"></label>'
      + '<label>Usuario<input name="usuario" required autocomplete="username"></label>'
      + '<label>Contraseña<input name="clave" type="password" required autocomplete="current-password"></label>'
      + '<button>Entrar</button></form>';
    if (msg) document.querySelector('.err').textContent = msg;
    const f = document.querySelector('form');
    f.servidor.value = prev.servidor || '';
    f.usuario.value = prev.usuario || '';
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const servidor = f.servidor.value.trim().replace(/^[a-z]+:\/\//i, '').replace(/[:/].*$/, '');
      escribir(CLAVE_MQTT, { servidor: servidor, usuario: f.usuario.value.trim(), clave: f.clave.value });
      location.reload();
    });
  };

  let cfgNube = null;
  if (NUBE) {
    // Se registra acá y no en index.html: la pantalla de ingreso o la app reemplazan la página antes
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
    cfgNube = leer(CLAVE_MQTT);
    if (!cfgNube || !cfgNube.servidor || !cfgNube.clave) { pedirClave(''); return; }
  }
  const alFallar = (msg) => { const c = leer(CLAVE_MQTT) || {}; delete c.clave; escribir(CLAVE_MQTT, c); pedirClave(msg); };
  setInterval(avisar, 20000);  // reloj y fecha de la pantalla

  /* ---------- Arranque de la pantalla ---------- */
  // screen y no innerWidth: la página de ESPHome no trae viewport y el móvil diría 980 px
  const corto = Math.min(window.screen.width, window.screen.height);
  const formato = corto < 600 ? 'movil' : 'tablet';
  const blob = (txt) => URL.createObjectURL(new Blob([txt], { type: 'text/javascript' }));
  window.__resources = {};
  Object.keys(D.libs).forEach((url) => { window.__resources[url] = blob(D.libs[url]); });

  const doc = new DOMParser().parseFromString(D.layouts[formato], 'text/html');
  // Lo que trae la página de la nube para instalarse como app (manifest, íconos)
  document.querySelectorAll('link[rel=manifest], link[rel~=icon], link[rel=apple-touch-icon], meta[name=theme-color]')
    .forEach((el) => doc.head.appendChild(doc.importNode(el, true)));
  const meta = (attrs) => { const m = doc.createElement('meta'); Object.assign(m, attrs); doc.head.prepend(m); };
  meta({ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' });
  if (!doc.querySelector('meta[name=theme-color]')) meta({ name: 'theme-color', content: '#0b1d20' });
  meta({ name: 'mobile-web-app-capable', content: 'yes' });
  doc.title = 'AquaControl';
  const css = doc.createElement('style');
  css.textContent = 'html,body{margin:0;height:100%;background:#0a191b;overflow:hidden}';
  doc.head.appendChild(css);
  const motor = doc.createElement('script');
  motor.src = blob(D.runtime);
  doc.head.appendChild(motor);
  document.documentElement.replaceWith(doc.documentElement);

  // Los scripts insertados así no corren: se recrean en orden
  (async () => {
    for (const viejo of Array.from(document.scripts)) {
      const s = document.createElement('script');
      for (const a of viejo.attributes) s.setAttribute(a.name, a.value);
      s.textContent = viejo.textContent;
      const listo = s.src ? new Promise((r) => { s.onload = s.onerror = r; }) : null;
      viejo.replaceWith(s);
      if (listo) await listo;
    }
    if (NUBE) conectarNube(cfgNube, alFallar); else conectarLocal();
  })();

  // El diseño mide 1280×800 (tablet) o 412×915 (móvil): se escala a la pantalla
  const [W, H] = formato === 'movil' ? [412, 915] : [1280, 800];
  const ajustar = () => {
    const raiz = Array.from(document.querySelectorAll('div')).find((el) => el.style.width === W + 'px' && (el.style.height === H + 'px' || el.dataset.aq));
    if (!raiz) return false;
    raiz.dataset.aq = '1';
    // Móvil: ocupa todo el ancho y el alto se estira a la pantalla. Tablet: entra entera.
    const z = formato === 'movil' ? window.innerWidth / W : Math.min(window.innerWidth / W, window.innerHeight / H);
    raiz.style.zoom = z;
    if (formato === 'movil') raiz.style.height = (window.innerHeight / z) + 'px';
    raiz.style.margin = '0 auto';
    return true;
  };
  const esperar = () => { if (!ajustar()) requestAnimationFrame(esperar); };
  esperar();
  window.addEventListener('resize', ajustar);
})();
