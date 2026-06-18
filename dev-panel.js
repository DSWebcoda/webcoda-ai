// dev-panel.js — localhost token editor + inspectors, never pushed to live
(function () {
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;

  var root = document.documentElement;

  var TEXT_ORDER  = ['--text-9xl','--text-8xl','--text-7xl','--text-6xl','--text-5xl',
    '--text-4xl','--text-3xl','--text-2xl','--text-xl','--text-lg','--text-base','--text-sm','--text-xs'];
  var FS_ORDER    = ['--fs-display','--fs-heading-01','--fs-heading-02','--fs-heading-03',
    '--fs-heading-04','--fs-heading-05','--fs-body-lg','--fs-body','--fs-body-sm','--fs-body-xs','--fs-caption','--fs-label','--fs-nav-primary','--fs-button-md','--fs-button-sm'];
  var SPACE_ORDER = ['--space-24','--space-20','--space-18','--space-16','--space-14','--space-12',
    '--space-10','--space-9','--space-8','--space-7','--space-6','--space-5','--space-4','--space-3','--space-2','--space-1'];
  var SP_ORDER    = ['--sp-outer'];

  // Palette for type-inspect badges — cycles through these
  var BADGE_COLORS = [
    {bg:'#EA4133',fg:'#fff'},
    {bg:'#2563eb',fg:'#fff'},
    {bg:'#16a34a',fg:'#fff'},
    {bg:'#d97706',fg:'#fff'},
    {bg:'#7c3aed',fg:'#fff'},
    {bg:'#0891b2',fg:'#fff'},
    {bg:'#be185d',fg:'#fff'},
    {bg:'#65a30d',fg:'#fff'},
  ];

  var INLINE_TAGS = {SPAN:1,EM:1,I:1,STRONG:1,B:1,A:1,MARK:1,ABBR:1,CITE:1,CODE:1,SMALL:1,SUB:1,SUP:1,TIME:1,U:1,S:1,BDI:1,BDO:1};

  function isInline(el) {
    // Use computed display so block-styled <a>/<span> are treated as block elements
    var d = getComputedStyle(el).display;
    return d === 'inline' || d === 'inline-flex' || d === 'inline-grid' || d === 'inline-block' || d === 'inline-table';
  }

  function sorted(keys, order) {
    var a = order.filter(function(k){ return keys.indexOf(k) !== -1; });
    var b = keys.filter(function(k){ return order.indexOf(k) === -1; }).sort();
    return a.concat(b);
  }

  function getRootTokens() {
    var t = {};
    function scanRules(rules) {
      for (var j = 0; j < rules.length; j++) {
        var r = rules[j];
        if (r.selectorText === ':root') {
          (r.cssText.match(/--[\w-]+\s*:[^;]+/g) || []).forEach(function(m) {
            var idx = m.indexOf(':');
            t[m.slice(0,idx).trim()] = m.slice(idx+1).trim();
          });
        }
        // also scan @media blocks
        if (r.cssRules) { try { scanRules(r.cssRules); } catch(e) {} }
      }
    }
    for (var i = 0; i < document.styleSheets.length; i++) {
      try { scanRules(document.styleSheets[i].cssRules); } catch(e) {}
    }
    return t;
  }

  function live(prop) { return getComputedStyle(root).getPropertyValue(prop).trim(); }
  function varName(val) { var m = val.match(/var\((--[\w-]+)\)/); return m ? m[1] : null; }
  function px(val) { return parseFloat(val) || 0; }

  // Resolve a CSS custom property to its actual computed px value,
  // handling clamp() and other expressions that parseFloat can't handle directly.
  var _resolveEl = null;
  function resolvedPx(prop) {
    var raw = live(prop);
    var direct = parseFloat(raw);
    if (!isNaN(direct)) return direct;
    // Use a temp element to let the browser compute the value
    if (!_resolveEl) {
      _resolveEl = document.createElement('div');
      _resolveEl.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
      document.body.appendChild(_resolveEl);
    }
    _resolveEl.style.fontSize = 'var(' + prop + ')';
    return parseFloat(getComputedStyle(_resolveEl).fontSize) || 0;
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  var s = document.createElement('style');
  s.textContent = [
    'body.dp-open{--1vw:calc((100vw - 300px) / 100);}',
    '#dp{all:initial;position:fixed;top:0;right:0;width:320px;height:100vh;background:#ffffff;border-left:1px solid #e0e0e0;z-index:99999;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;font-size:12px;color:#111;transform:translateX(100%);transition:transform 0.25s cubic-bezier(0.22,1,0.36,1);box-sizing:border-box;}',
    '#dp *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;}',
    '#dp.open{transform:translateX(0);}',
    '#dp-tab{position:fixed;bottom:20px;right:20px;background:#fff;color:#111;border:1px solid #e0e0e0;cursor:pointer;padding:6px 12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;font-size:11px;font-weight:500;z-index:100000;transition:right 0.25s cubic-bezier(0.22,1,0.36,1);border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.12);}',
    '#dp-tab:hover{background:#f5f5f5;}',
    '#dp-tab.open{display:none;}',
    '#dp-head{padding:12px 14px 10px;border-bottom:1px solid #e0e0e0;display:flex;flex-direction:column;gap:10px;flex-shrink:0;background:#fff;}',
    '#dp-head-top{display:flex;justify-content:space-between;align-items:center;}',
    '#dp-close{all:initial;background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;font-family:inherit;border-radius:4px;}',
    '#dp-close:hover{color:#111;background:#f0f0f0;}',
    '#dp-head h2{margin:0;font-size:11px;color:#888;font-weight:500;}',
    '#dp-inspect-btns{padding:2px 0 6px;}',
    '.dp-inspect-btn{display:flex;flex-direction:row;align-items:center;gap:0;background:none;border:none;color:#555;padding:6px 0;margin:0;font-family:inherit;font-size:12px;cursor:pointer;width:100%;text-align:left;-webkit-appearance:none;appearance:none;}',
    '.dp-inspect-btn .dp-toggle{margin-right:12px;}',
    '.dp-inspect-btn:hover{color:#111;}',
    '.dp-toggle{display:inline-block;flex-shrink:0;width:32px;height:18px;background:#ccc;border-radius:9px;position:relative;transition:background 0.18s;vertical-align:middle;margin-top:1px;}',
    '.dp-toggle::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;background:#fff;border-radius:50%;transition:left 0.18s;box-shadow:0 1px 3px rgba(0,0,0,0.25);}',
    '.dp-inspect-btn.active{color:#111;}',
    '.dp-inspect-btn.active .dp-toggle{background:#111;}',
    '.dp-inspect-btn.active .dp-toggle::after{left:16px;}',
    '#dp-body{flex:1;overflow-y:auto;padding-bottom:40px;background:#fff;}',
    '#dp-body::-webkit-scrollbar{width:3px;}',
    '#dp-body::-webkit-scrollbar-thumb{background:#ddd;}',
    '.dp-gh{padding:14px 14px 4px;font-size:10px;color:#999;font-weight:600;}',
    '.dp-divider{border:none;border-top:1px solid #e0e0e0;margin:8px 0 0;}',
    '.dp-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;padding:4px 14px;min-height:28px;}',
    '.dp-row-pair{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:6px;padding:4px 14px;min-height:28px;}',
    '.dp-row-pair:hover,.dp-row:hover{background:#f2f2f2;}',
    '.dp-sub{font-size:11px;color:#bbb;text-align:right;white-space:nowrap;}',
    '.dp-lbl{font-size:12px;color:#444;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.dp-val{font-size:12px;color:#111;text-align:right;}',
    'input[type=color]{width:24px;height:24px;border:1px solid #ddd;background:#fff;cursor:pointer;padding:1px;vertical-align:middle;border-radius:3px;}',
    'input[type=number]{width:58px;background:#fff;border:1px solid #ddd;color:#111;padding:3px 6px;font-family:ui-monospace,"SF Mono","Menlo",monospace;font-size:11px;text-align:right;-moz-appearance:textfield;appearance:textfield;border-radius:3px;}',
    'input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}',
    'input[type=number]:focus{outline:none;border-color:#555;background:#fff;}',
    'select{background:#fff;border:1px solid #ddd;color:#111;padding:3px 6px;font-family:inherit;font-size:11px;max-width:150px;border-radius:3px;}',
    'select:focus{outline:none;border-color:#555;}',
    '#dp-foot{padding:10px 14px;border-top:1px solid #e0e0e0;flex-shrink:0;display:flex;gap:8px;align-items:center;background:#fff;}',
    '#dp-foot button{flex:1;background:#f2f2f2;border:1px solid #ddd;color:#444;padding:7px;font-family:inherit;font-size:11px;cursor:pointer;border-radius:4px;}',
    '#dp-foot button:hover{border-color:#555;color:#111;}',
    '#dp-copied{font-size:11px;color:#555;display:none;}',
    '#dp-section-tabs{display:flex;gap:0;border:1px solid #ddd;border-radius:6px;overflow:hidden;}',
    '.dp-sec-btn{flex:1;background:#fff;border:none;border-right:1px solid #ddd;color:#888;padding:6px 4px;font-family:inherit;font-size:11px;cursor:pointer;transition:background 0.12s,color 0.12s;}',
    '.dp-sec-btn:last-child{border-right:none;}',
    '.dp-sec-btn:hover{background:#f2f2f2;color:#111;}',
    '.dp-sec-btn.active{background:#111;color:#fff;}',
    '.dp-col-head{display:grid;align-items:center;gap:4px;padding:3px 14px;font-size:10px;color:#bbb;}',
    '.dp-col-head.clamp{grid-template-columns:1fr 48px 48px 48px;}',
    '.dp-col-head.fixed{grid-template-columns:1fr 48px 48px;}',
    '.dp-prim-row{display:grid;align-items:center;gap:4px;padding:3px 14px;min-height:28px;}',
    '.dp-prim-row.clamp{grid-template-columns:1fr 48px 48px 48px;}',
    '.dp-prim-row.fixed{grid-template-columns:1fr 48px 48px;}',
    '.dp-prim-row:hover{background:#f2f2f2;}',
    '.dp-prim-row .dp-lbl{font-size:12px;color:#444;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.dp-prim-row input[type=number]{width:100%;box-sizing:border-box;}',
    '#dp-save{background:#111 !important;border-color:#111 !important;color:#fff !important;}',
    '#dp-save:hover{background:#333 !important;border-color:#333 !important;color:#fff !important;}',
    // ── Type inspect overlay
    '#dp-type-overlay{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99990;}',
    '.dp-ti-badge{position:fixed;font-family:"JetBrains Mono",monospace;font-size:9px;font-weight:500;line-height:1;padding:2px 5px;border-radius:2px;pointer-events:auto;white-space:nowrap;z-index:99991;letter-spacing:0.04em;cursor:pointer;}',
    '.dp-ti-badge:hover{opacity:0.85;}',
    '.dp-ti-outline{position:fixed;pointer-events:none;z-index:99989;box-sizing:border-box;}',
    // ── Type edit picker
    '#dp-ti-picker{position:fixed;z-index:99995;background:#fff;border:1px solid #ccc;border-radius:3px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px 0;font-family:ui-monospace,"SF Mono","Menlo",monospace;font-size:10px;min-width:160px;}',
    '#dp-ti-picker button{display:block;width:100%;text-align:left;padding:5px 10px;background:none;border:none;cursor:pointer;color:#1a1a1a;font-family:inherit;font-size:10px;}',
    '#dp-ti-picker button:hover{background:#e8f0ff;color:#0066cc;}',
    '#dp-ti-picker button.current{color:#0066cc;font-weight:600;}',
    '#dp-ti-picker hr{border:none;border-top:1px solid #e0e0e0;margin:3px 0;}',
    // ── Type changes panel
    '#dp-ti-changes{padding:8px 12px;border-top:1px solid #e0e0e0;background:#f0f4ff;display:none;}',
    '#dp-ti-changes-label{font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#0066cc;margin-bottom:6px;font-weight:600;}',
    '#dp-ti-changes-list{font-size:9px;color:#333;margin-bottom:6px;max-height:80px;overflow-y:auto;}',
    '#dp-ti-changes-list div{padding:2px 0;border-bottom:1px solid #dde3f5;}',
    '#dp-ti-copy{width:100%;background:#0066cc;border:none;color:#fff;padding:5px;font-family:inherit;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;border-radius:2px;}',
    '#dp-ti-copy:hover{background:#0052a3;}',
    '#dp-ti-clear{width:100%;background:none;border:1px solid #ccc;color:#666;padding:4px;font-family:inherit;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;border-radius:2px;margin-top:4px;}',
    // ── Spacing inspect overlay
    '#dp-sp-overlay{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99990;}',
    '.dp-sp-margin{position:fixed;background:rgba(251,191,36,0.25);border:2px solid rgba(251,191,36,0.8);pointer-events:none;box-sizing:border-box;}',
    '.dp-sp-padding{position:fixed;background:rgba(134,239,172,0.25);border:2px solid rgba(134,239,172,0.8);pointer-events:none;box-sizing:border-box;}',
    '.dp-sp-label{position:fixed;font-family:"JetBrains Mono",monospace;font-size:9px;line-height:1;padding:2px 4px;pointer-events:none;white-space:nowrap;}',
    '.dp-sp-label.margin{background:rgba(251,191,36,0.9);color:#000;}',
    '.dp-sp-label.padding{background:rgba(134,239,172,0.9);color:#000;}',
    '.dp-sp-gap{position:fixed;background:rgba(167,139,250,0.25);border:2px solid rgba(167,139,250,0.8);pointer-events:none;box-sizing:border-box;}',
    '.dp-sp-label.gap{background:rgba(167,139,250,0.9);color:#fff;}',
    '.dp-sp-label.clickable{pointer-events:auto;cursor:pointer;text-decoration:underline;}',
    '.dp-sp-label.clickable:hover{opacity:0.8;}',
    // ── Spacing picker
    '#dp-sp-picker{position:fixed;z-index:99995;background:#fff;border:1px solid #ccc;border-radius:3px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px 0;font-family:ui-monospace,"SF Mono","Menlo",monospace;font-size:10px;min-width:160px;}',
    '#dp-sp-picker button{display:block;width:100%;text-align:left;padding:5px 10px;background:none;border:none;cursor:pointer;color:#1a1a1a;font-family:inherit;font-size:10px;}',
    '#dp-sp-picker button:hover{background:#f0ebff;color:#7c3aed;}',
    '#dp-sp-picker button.current{color:#7c3aed;font-weight:600;}',
    // ── Spacing changes panel
    '#dp-sp-changes{padding:8px 12px;border-top:1px solid #e0e0e0;background:#f5f0ff;display:none;}',
    '#dp-sp-changes-label{font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#7c3aed;margin-bottom:6px;font-weight:600;}',
    '#dp-sp-changes-list{font-size:9px;color:#333;margin-bottom:6px;max-height:80px;overflow-y:auto;}',
    '#dp-sp-changes-list div{padding:2px 0;border-bottom:1px solid #e5ddf5;}',
    '#dp-sp-copy{width:100%;background:#7c3aed;border:none;color:#fff;padding:5px;font-family:inherit;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;border-radius:2px;}',
    '#dp-sp-copy:hover{background:#6d28d9;}',
    '#dp-sp-clear{width:100%;background:none;border:1px solid #ccc;color:#666;padding:4px;font-family:inherit;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;border-radius:2px;margin-top:4px;}',
  ].join('');
  document.head.appendChild(s);

  // ── DOM ──────────────────────────────────────────────────────────────────────
  var tab = document.createElement('button');
  tab.id = 'dp-tab'; tab.textContent = 'Design System';
  document.body.appendChild(tab);

  var panel = document.createElement('div');
  panel.id = 'dp';
  panel.innerHTML =
    '<div id="dp-head">' +
      '<div id="dp-head-top"><h2>Design System Editor</h2><button id="dp-close">&#x2715;</button></div>' +
      '<div id="dp-section-tabs">' +
        '<button class="dp-sec-btn active" data-sec="colours">Colours</button>' +
        '<button class="dp-sec-btn" data-sec="type">Type</button>' +
        '<button class="dp-sec-btn" data-sec="spacing">Spacing</button>' +
      '</div>' +
      '<div id="dp-inspect-btns" style="display:none;">' +
        '<button class="dp-inspect-btn" id="dp-btn-type" style="display:none;"><span class="dp-toggle"></span><span>Inspect type</span></button>' +
        '<button class="dp-inspect-btn" id="dp-btn-space" style="display:none;"><span class="dp-toggle"></span><span>Inspect spacing</span></button>' +
      '</div>' +
    '</div>' +
    '<div id="dp-body"></div>' +
    '<div id="dp-ti-changes"><div id="dp-ti-changes-label">Type Changes</div><div id="dp-ti-changes-list"></div><button id="dp-ti-copy">Copy JSON</button><button id="dp-ti-clear">Clear</button></div>' +
    '<div id="dp-sp-changes"><div id="dp-sp-changes-label">Spacing Changes</div><div id="dp-sp-changes-list"></div><button id="dp-sp-copy">Copy JSON</button><button id="dp-sp-clear">Clear</button></div>' +
    '<div id="dp-foot"><button id="dp-save">Save to CSS</button><button id="dp-reset">Reset</button><span id="dp-copied">Copied!</span></div>';
  document.body.appendChild(panel);

  var body = panel.querySelector('#dp-body');
  var overrides = {};
  var activeSection = 'colours';

  panel.querySelectorAll('.dp-sec-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      activeSection = btn.dataset.sec;
      panel.querySelectorAll('.dp-sec-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      build();
    });
  });

  function gh(label, divider) {
    if (divider) { var hr = document.createElement('hr'); hr.className = 'dp-divider'; body.appendChild(hr); }
    var d = document.createElement('div'); d.className = 'dp-gh'; d.textContent = label;
    body.appendChild(d);
  }

  function addRow(key) {
    var d = document.createElement('div'); d.className = 'dp-row';
    var lbl = document.createElement('div'); lbl.className = 'dp-lbl';
    lbl.title = key; lbl.textContent = key.replace('--','');
    d.appendChild(lbl); body.appendChild(d); return d;
  }

  function numInput(val, step, onchange) {
    var inp = document.createElement('input');
    inp.type = 'number'; inp.value = val; inp.step = step; inp.min = 0;
    inp.addEventListener('change', function(){ onchange(inp.value); });
    inp.addEventListener('input', function(){ onchange(inp.value); });
    return inp;
  }

  function build() {
    body.innerHTML = '';
    var tokens = getRootTokens();
    var keys = Object.keys(tokens);
    var inspectBtns = panel.querySelector('#dp-inspect-btns');

    var btnType = panel.querySelector('#dp-btn-type');
    var btnSpace = panel.querySelector('#dp-btn-space');

    if (activeSection === 'colours') {
      inspectBtns.style.display = 'none';
      btnType.style.display = 'none';
      btnSpace.style.display = 'none';
      keys.filter(function(k){ return k.startsWith('--color-'); }).sort().forEach(function(key) {
        var r = addRow(key); var v = live(key);
        var ctrl = document.createElement('div'); ctrl.className = 'dp-val';
        function rgbaToHex(s) {
          var m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
          if (!m) return null;
          return '#' + [m[1],m[2],m[3]].map(function(n){ return ('0'+parseInt(n).toString(16)).slice(-2); }).join('');
        }
        var hexVal = /^#[0-9a-fA-F]{3,6}$/.test(v) ? (v.length === 4 ? '#'+v[1]+v[1]+v[2]+v[2]+v[3]+v[3] : v) : rgbaToHex(v);
        if (hexVal) {
          var inp = document.createElement('input'); inp.type = 'color';
          inp.value = hexVal;
          inp.addEventListener('input', function(){ overrides[key]=inp.value; root.style.setProperty(key,inp.value); });
          ctrl.appendChild(inp);
        } else { ctrl.textContent = v; ctrl.style.color = '#999'; }
        r.appendChild(ctrl);
      });

    } else if (activeSection === 'type') {
      inspectBtns.style.display = 'flex';
      btnType.style.display = 'block';
      btnSpace.style.display = 'none';
      stopSpaceInspect(); panel.querySelector('#dp-btn-space').classList.remove('active');
      var textPrims = sorted(keys.filter(function(k){ return k.startsWith('--text-'); }), TEXT_ORDER);

      gh('Primitives');

      // Column headers
      var clampPrims = textPrims.filter(function(k){ return (tokens[k]||'').indexOf('clamp') !== -1; });
      var fixedPrims = textPrims.filter(function(k){ return (tokens[k]||'').indexOf('clamp') === -1; });

      if (clampPrims.length) {
        var ch = document.createElement('div'); ch.className = 'dp-col-head clamp';
        ch.innerHTML = '<span></span><span>min px</span><span>max px</span><span>lh %</span>';
        body.appendChild(ch);
        clampPrims.forEach(function(key) {
          var suffix = key.replace('--text-','');
          var lhKey = '--lh-' + suffix;
          var clampM = (tokens[key]||'').match(/clamp\(\s*([0-9.]+)px\s*,[^,]+,\s*([0-9.]+)px\s*\)/);
          var r = document.createElement('div'); r.className = 'dp-prim-row clamp';
          var lbl = document.createElement('div'); lbl.className = 'dp-lbl'; lbl.textContent = suffix;
          var minInp = numInput(parseFloat(clampM[1]), 1, function(){ rebuildClamp(key, minInp, maxInp); });
          var maxInp = numInput(parseFloat(clampM[2]), 1, function(){ rebuildClamp(key, minInp, maxInp); });
          var lhVal = parseFloat(live(lhKey)) || 1;
          var lhCtrl = numInput(Math.round(lhVal*100), 1, function(v){ var ratio=v/100; overrides[lhKey]=ratio; root.style.setProperty(lhKey,ratio); });
          r.appendChild(lbl); r.appendChild(minInp); r.appendChild(maxInp); r.appendChild(lhCtrl);
          body.appendChild(r);
        });
      }

      if (fixedPrims.length) {
        fixedPrims.forEach(function(key) {
          var suffix = key.replace('--text-','');
          var lhKey = '--lh-' + suffix;
          var r = document.createElement('div'); r.className = 'dp-prim-row fixed';
          var lbl = document.createElement('div'); lbl.className = 'dp-lbl'; lbl.textContent = suffix;
          var fsCtrl = numInput(resolvedPx(key), 1, function(v){ overrides[key]=v+'px'; root.style.setProperty(key,v+'px'); });
          var lhVal = parseFloat(live(lhKey)) || 1;
          var lhCtrl = numInput(Math.round(lhVal*100), 1, function(v){ var ratio=v/100; overrides[lhKey]=ratio; root.style.setProperty(lhKey,ratio); });
          r.appendChild(lbl); r.appendChild(fsCtrl); r.appendChild(lhCtrl);
          body.appendChild(r);
        });
      }

      gh('Semantic', true);
      sorted(keys.filter(function(k){ return k.startsWith('--fs-'); }), FS_ORDER).forEach(function(key) {
        var r = addRow(key); var rawDef = tokens[key]; var cur = varName(rawDef) || '';
        var ctrl = document.createElement('div'); ctrl.className = 'dp-val';
        var sel = document.createElement('select');
        textPrims.forEach(function(p){
          var opt = document.createElement('option'); opt.value = p;
          opt.textContent = p.replace('--text-','') + ' — ' + resolvedPx(p)+'px';
          opt.selected = p === cur; sel.appendChild(opt);
        });
        sel.addEventListener('change', function(){ overrides[key]='var('+sel.value+')'; root.style.setProperty(key,live(sel.value)); });
        ctrl.appendChild(sel); r.appendChild(ctrl);
      });

    } else if (activeSection === 'spacing') {
      inspectBtns.style.display = 'flex';
      btnSpace.style.display = 'block';
      btnType.style.display = 'none';
      stopTypeInspect(); panel.querySelector('#dp-btn-type').classList.remove('active');
      var spacePrims = sorted(keys.filter(function(k){ return k.startsWith('--space-'); }), SPACE_ORDER);

      gh('Primitives');
      spacePrims.forEach(function(key) {
        var r = document.createElement('div'); r.className = 'dp-row-pair';
        var lbl = document.createElement('div'); lbl.className = 'dp-lbl'; lbl.title = key; lbl.textContent = key.replace('--space-','');
        var fsCtrl = numInput(resolvedPx(key), 1, function(v){ overrides[key]=v+'px'; root.style.setProperty(key,v+'px'); });
        r.appendChild(lbl); r.appendChild(fsCtrl); body.appendChild(r);
      });

      gh('Semantic', true);
      sorted(keys.filter(function(k){ return k.startsWith('--sp-'); }), SP_ORDER).forEach(function(key) {
        var r = addRow(key); var rawDef = tokens[key]; var cur = varName(rawDef) || '';
        var ctrl = document.createElement('div'); ctrl.className = 'dp-val';
        var sel = document.createElement('select');
        spacePrims.forEach(function(p){
          var opt = document.createElement('option'); opt.value = p;
          opt.textContent = p.replace('--space-','') + ' — ' + live(p);
          opt.selected = p === cur; sel.appendChild(opt);
        });
        sel.addEventListener('change', function(){ overrides[key]='var('+sel.value+')'; root.style.setProperty(key,live(sel.value)); });
        ctrl.appendChild(sel); r.appendChild(ctrl);
      });
    }
  }

  function rebuildClamp(key, minInp, maxInp) {
    var minV = parseFloat(minInp.value);
    var maxV = parseFloat(maxInp.value);
    var vwMultiplier = Math.round((maxV / 1440) * 100);
    var val = 'clamp('+minV+'px, calc('+vwMultiplier+' * var(--1vw)), '+maxV+'px)';
    overrides[key] = val; root.style.setProperty(key, val);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TYPE INSPECTOR
  // ════════════════════════════════════════════════════════════════════════════
  var typeInspectOn = false;
  var typeOverlay = null;
  var typeRAF = null;

  function buildFsMap() {
    // Map computed px value → --fs-* token name
    var map = {};
    FS_ORDER.forEach(function(tok) {
      var v = resolvedPx(tok);
      if (v) map[Math.round(v)] = tok.replace('--fs-','');
    });
    // Also map --text-* as fallback
    TEXT_ORDER.forEach(function(tok) {
      var v = resolvedPx(tok);
      var label = tok.replace('--text-','');
      if (v && !map[Math.round(v)]) map[Math.round(v)] = label;
    });
    return map;
  }

  function isVisible(el) {
    var s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  }

  function hasOwnText(el) {
    // Direct text node
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim()) return true;
    }
    // Text only via inline children (e.g. h1 > span)
    if (!el.textContent.trim()) return false;
    var kids = el.querySelectorAll('*');
    for (var j = 0; j < kids.length; j++) {
      if (!isInline(kids[j]) && kids[j].textContent.trim()) return false;
    }
    return el.textContent.trim().length > 0;
  }

  function renderTypeOverlay() {
    if (!typeInspectOn) return;
    if (typeOverlay) typeOverlay.remove();

    typeOverlay = document.createElement('div');
    typeOverlay.id = 'dp-type-overlay';
    document.body.appendChild(typeOverlay);

    var fsMap = buildFsMap();
    var colorMap = {};
    var colorIdx = 0;
    var panelRight = panel.classList.contains('open') ? 300 : 0;

    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.closest('#dp') || el.closest('#dp-tab') || el.closest('#dp-type-overlay') || el.closest('#dp-sp-overlay')) continue;
      if (!isVisible(el)) continue;
      if (isInline(el)) continue;
      if (!hasOwnText(el)) continue;

      var fs = Math.round(parseFloat(getComputedStyle(el).fontSize));
      var label = fsMap[fs] || (fs + 'px');

      var rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      if (rect.right < 0 || rect.bottom < 0) continue;
      if (rect.left > window.innerWidth - panelRight) continue;

      // Assign a consistent colour per label
      if (!colorMap[label]) {
        colorMap[label] = BADGE_COLORS[colorIdx % BADGE_COLORS.length];
        colorIdx++;
      }
      var c = colorMap[label];

      // Outline
      var outline = document.createElement('div');
      outline.className = 'dp-ti-outline';
      outline.style.cssText = 'left:'+rect.left+'px;top:'+rect.top+'px;width:'+rect.width+'px;height:'+rect.height+'px;border:1px solid '+c.bg+';opacity:0.5;';
      typeOverlay.appendChild(outline);

      // Badge
      var badge = document.createElement('div');
      badge.className = 'dp-ti-badge';
      badge.textContent = label;
      badge.style.cssText = 'background:'+c.bg+';color:'+c.fg+';left:'+rect.left+'px;top:'+(rect.top)+'px;';
      badge._el = el;
      badge.addEventListener('click', onTypeBadgeClick);
      typeOverlay.appendChild(badge);
    }
  }

  function startTypeInspect() {
    typeInspectOn = true;
    renderTypeOverlay();
    window.addEventListener('scroll', onTypeScroll, true);
    window.addEventListener('resize', renderTypeOverlay);
  }

  function stopTypeInspect() {
    typeInspectOn = false;
    if (typeOverlay) { typeOverlay.remove(); typeOverlay = null; }
    closePicker();
    window.removeEventListener('scroll', onTypeScroll, true);
    window.removeEventListener('resize', renderTypeOverlay);
  }

  function onTypeScroll() {
    if (typeRAF) cancelAnimationFrame(typeRAF);
    typeRAF = requestAnimationFrame(renderTypeOverlay);
  }

  // ── Type edit (click badge → pick token) ─────────────────────────────────────
  var typeChanges = [];   // [{tag, classes, textPreview, from, to, el}]
  var tiPicker = null;

  var DYNAMIC_CLASSES = {
    'fx-r':1,'fx-in':1,'fx-split':1,'active':1,'open':1,'hover':1,
    'focus':1,'disabled':1,'selected':1,'checked':1,'visible':1,'hidden':1
  };

  function elementSelector(el) {
    var parts = [el.tagName.toLowerCase()];
    if (el.id) parts.push('#' + el.id);
    el.classList.forEach(function(c) { if (!DYNAMIC_CLASSES[c]) parts.push('.' + c); });
    return parts.join('');
  }

  function closePicker() {
    if (tiPicker) { tiPicker.remove(); tiPicker = null; }
  }

  function openPicker(badge, el, currentLabel) {
    closePicker();
    var fsMap = buildFsMap();
    var currentToken = Object.keys(fsMap).reduce(function(found, px) {
      return fsMap[px] === currentLabel ? '--fs-' + currentLabel : found;
    }, null) || ('--fs-' + currentLabel);

    tiPicker = document.createElement('div');
    tiPicker.id = 'dp-ti-picker';

    FS_ORDER.forEach(function(tok) {
      var btn = document.createElement('button');
      btn.textContent = tok.replace('--fs-', '');
      if (tok === currentToken) btn.className = 'current';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        applyTypeChange(el, currentToken, tok, currentLabel);
        closePicker();
        renderTypeOverlay();
      });
      tiPicker.appendChild(btn);
    });

    var rect = badge.getBoundingClientRect();
    tiPicker.style.left = rect.left + 'px';
    tiPicker.style.top = (rect.bottom + 4) + 'px';
    document.body.appendChild(tiPicker);

    setTimeout(function() {
      document.addEventListener('click', closePicker, { once: true });
    }, 0);
  }

  var SERIF_TOKENS = {'--fs-display':1,'--fs-heading-01':1,'--fs-heading-02':1,'--fs-heading-03':1,'--fs-heading-04':1,'--fs-heading-05':1};

  var TOKEN_LH = {
    '--fs-display':   '--lh-9xl',
    '--fs-heading-01':'--lh-7xl',
    '--fs-heading-02':'--lh-6xl',
    '--fs-heading-03':'--lh-5xl',
    '--fs-heading-04':'--lh-4xl',
    '--fs-heading-05':'--lh-3xl',
    '--fs-body-lg':   '--lh-2xl',
    '--fs-body':      '--lh-xl',
    '--fs-body-sm':   '--lh-lg',
    '--fs-body-xs':   '--lh-base',
    '--fs-caption':   '--lh-sm',
    '--fs-label':     '--lh-xs'
  };

  function tokenFont(tok) {
    return SERIF_TOKENS[tok] ? live('--font-serif') : live('--font-sans');
  }

  function listingScope(el) {
    var sel = elementSelector(el);
    var best = null;
    var p = el.parentElement;
    var stopTags = { 'SECTION': 1, 'MAIN': 1, 'ARTICLE': 1 };
    while (p && p !== document.body) {
      if (p.querySelectorAll(sel).length > 1) best = p;
      if (stopTags[p.tagName]) break;
      p = p.parentElement;
    }
    return best;
  }

  function applyTypeChange(el, fromToken, toToken, fromLabel) {
    var sel = elementSelector(el);
    var scope = listingScope(el);
    var targets = scope ? Array.from(scope.querySelectorAll(sel)) : [el];
    if (targets.indexOf(el) === -1) targets = [el];

    targets.forEach(function(t) {
      t.style.fontSize = 'var(' + toToken + ')';
      t.style.fontFamily = tokenFont(toToken);
      t.style.lineHeight = TOKEN_LH[toToken] ? 'var(' + TOKEN_LH[toToken] + ')' : '';

      var existing = typeChanges.findIndex(function(c) { return c.el === t; });
      var entry = {
        el: t,
        tag: t.tagName.toLowerCase(),
        classes: Array.from(t.classList),
        id: t.id || null,
        textPreview: t.textContent.trim().slice(0, 40),
        from: fromToken,
        to: toToken
      };
      if (existing >= 0) {
        if (typeChanges[existing].from === toToken) {
          t.style.fontSize = '';
          t.style.fontFamily = '';
          t.style.lineHeight = '';
          typeChanges.splice(existing, 1);
        } else {
          typeChanges[existing] = entry;
        }
      } else {
        typeChanges.push(entry);
      }
    });

    renderChangesPanel();
  }

  function renderChangesPanel() {
    var cp = panel.querySelector('#dp-ti-changes');
    var list = panel.querySelector('#dp-ti-changes-list');
    cp.style.display = typeChanges.length ? 'block' : 'none';
    list.innerHTML = '';
    typeChanges.forEach(function(c) {
      var d = document.createElement('div');
      d.textContent = c.tag + (c.id ? '#'+c.id : '') + ' "' + c.textPreview + '" → ' + c.to.replace('--fs-','');
      list.appendChild(d);
    });
  }

  function onTypeBadgeClick(e) {
    var badge = e.target.closest('.dp-ti-badge');
    if (!badge || !badge._el) return;
    e.stopPropagation();
    openPicker(badge, badge._el, badge.textContent.trim());
  }

  panel.querySelector('#dp-ti-copy').addEventListener('click', function() {
    var out = typeChanges.map(function(c) {
      return { tag: c.tag, classes: c.classes, id: c.id, textPreview: c.textPreview, from: c.from, to: c.to };
    });
    navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    this.textContent = 'Copied!';
    var btn = this;
    setTimeout(function() { btn.textContent = 'Copy JSON'; }, 2000);
  });

  panel.querySelector('#dp-ti-clear').addEventListener('click', function() {
    typeChanges.forEach(function(c) { c.el.style.fontSize = ''; c.el.style.fontFamily = ''; c.el.style.lineHeight = ''; });
    typeChanges = [];
    renderChangesPanel();
    renderTypeOverlay();
  });

  panel.querySelector('#dp-btn-type').addEventListener('click', function() {
    typeInspectOn ? stopTypeInspect() : startTypeInspect();
    this.classList.toggle('active', typeInspectOn);
    // turn off spacing if on
    if (typeInspectOn && spaceInspectOn) {
      stopSpaceInspect();
      panel.querySelector('#dp-btn-space').classList.remove('active');
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SPACING INSPECTOR
  // ════════════════════════════════════════════════════════════════════════════
  var spaceInspectOn = false;
  var spOverlay = null;
  var spTarget = null;

  function buildSpaceMap() {
    var map = {};
    // Primitives win — show raw scale values in inspector
    SPACE_ORDER.forEach(function(tok) {
      var v = Math.round(parseFloat(live(tok)));
      if (v && !map[v]) map[v] = tok.replace('--space-','');
    });
    return map;
  }

  // ── Spacing changes tracking ─────────────────────────────────────────────────
  var spaceChanges = [];
  var spPicker = null;

  function closeSpacePicker() {
    if (spPicker) { spPicker.remove(); spPicker = null; }
  }

  function applySpaceChange(el, prop, newToken) {
    var scope = listingScope(el);
    var targets = scope ? Array.from(scope.querySelectorAll(elementSelector(el))) : [el];
    if (targets.indexOf(el) === -1) targets = [el];

    var cssVal = 'var(' + newToken + ')';
    targets.forEach(function(t) {
      t.style[prop] = cssVal;
      var idx = spaceChanges.findIndex(function(c) { return c.el === t && c.prop === prop; });
      var entry = { el: t, prop: prop, to: newToken };
      if (idx >= 0) { spaceChanges[idx] = entry; } else { spaceChanges.push(entry); }
    });
    renderSpaceChangesPanel();
  }

  function openSpacePicker(labelEl, el, prop, currentPx) {
    closeSpacePicker();
    spPicker = document.createElement('div');
    spPicker.id = 'dp-sp-picker';
    SPACE_ORDER.forEach(function(tok) {
      var v = Math.round(parseFloat(live(tok)));
      var btn = document.createElement('button');
      btn.textContent = tok.replace('--space-', '') + ' — ' + v + 'px';
      if (Math.round(currentPx) === v) btn.className = 'current';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        applySpaceChange(el, prop, tok);
        closeSpacePicker();
        renderSpaceOverlay(spTarget);
      });
      spPicker.appendChild(btn);
    });
    var rect = labelEl.getBoundingClientRect();
    var left = rect.left;
    var top = rect.bottom + 4;
    if (left + 170 > window.innerWidth) left = window.innerWidth - 175;
    if (top + 220 > window.innerHeight) top = rect.top - 224;
    spPicker.style.left = left + 'px';
    spPicker.style.top = top + 'px';
    document.body.appendChild(spPicker);
    setTimeout(function() { document.addEventListener('click', closeSpacePicker, { once: true }); }, 0);
  }

  function renderSpaceChangesPanel() {
    var cp = panel.querySelector('#dp-sp-changes');
    var list = panel.querySelector('#dp-sp-changes-list');
    cp.style.display = spaceChanges.length ? 'block' : 'none';
    list.innerHTML = '';
    spaceChanges.forEach(function(c) {
      var d = document.createElement('div');
      var sel = elementSelector(c.el).slice(0, 30);
      d.textContent = sel + ' ' + c.prop + ' → ' + c.to.replace('--space-', '');
      list.appendChild(d);
    });
  }

  panel.querySelector('#dp-sp-copy').addEventListener('click', function() {
    var out = spaceChanges.map(function(c) {
      return { selector: elementSelector(c.el), prop: c.prop, to: c.to };
    });
    navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    this.textContent = 'Copied!';
    var btn = this;
    setTimeout(function() { btn.textContent = 'Copy JSON'; }, 2000);
  });

  panel.querySelector('#dp-sp-clear').addEventListener('click', function() {
    spaceChanges.forEach(function(c) { c.el.style[c.prop] = ''; });
    spaceChanges = [];
    renderSpaceChangesPanel();
    renderSpaceOverlay(spTarget);
  });

  function spLabel(val, spMap) {
    var v = Math.round(parseFloat(val));
    if (!v) return null;
    return (spMap[v] || v+'px');
  }

  function renderSpaceOverlay(el) {
    if (!spOverlay) return;
    spOverlay.innerHTML = '';
    if (!el) return;

    var spMap = buildSpaceMap();
    var cs = getComputedStyle(el);
    var rect = el.getBoundingClientRect();

    function makeBox(x,y,w,h,cls) {
      if (w <= 0 || h <= 0) return;
      var d = document.createElement('div');
      d.className = 'dp-sp-'+cls;
      d.style.cssText = 'left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px;';
      spOverlay.appendChild(d);
    }
    function makeLabel(x,y,text,cls,clickData) {
      var d = document.createElement('div');
      d.className = 'dp-sp-label '+cls+(clickData?' clickable':'');
      d.textContent = text;
      d.style.cssText = 'left:'+x+'px;top:'+y+'px;';
      if (clickData) {
        d.addEventListener('click', function(e) {
          e.stopPropagation();
          openSpacePicker(d, clickData.el, clickData.prop, clickData.val);
        });
      }
      spOverlay.appendChild(d);
    }

    // Element outline
    makeBox(rect.left, rect.top, rect.width, rect.height, 'padding');

    // All 4 margins
    var mt = parseFloat(cs.marginTop)||0, mr = parseFloat(cs.marginRight)||0;
    var mb = parseFloat(cs.marginBottom)||0, ml = parseFloat(cs.marginLeft)||0;
    if (mt) { makeBox(rect.left-ml, rect.top-mt, rect.width+ml+mr, mt, 'margin'); makeLabel(rect.left+4, rect.top-mt+2, spLabel(mt,spMap)||mt+'px', 'margin', {el:el,prop:'marginTop',val:mt}); }
    if (mb) { makeBox(rect.left-ml, rect.bottom, rect.width+ml+mr, mb, 'margin'); makeLabel(rect.left+4, rect.bottom+2, spLabel(mb,spMap)||mb+'px', 'margin', {el:el,prop:'marginBottom',val:mb}); }
    if (ml) { makeBox(rect.left-ml, rect.top, ml, rect.height, 'margin'); makeLabel(rect.left-ml+2, rect.top+2, spLabel(ml,spMap)||ml+'px', 'margin', {el:el,prop:'marginLeft',val:ml}); }
    if (mr) { makeBox(rect.right, rect.top, mr, rect.height, 'margin'); makeLabel(rect.right+2, rect.top+2, spLabel(mr,spMap)||mr+'px', 'margin', {el:el,prop:'marginRight',val:mr}); }

    // All 4 padding sides
    var pt = parseFloat(cs.paddingTop)||0, pr = parseFloat(cs.paddingRight)||0;
    var pb = parseFloat(cs.paddingBottom)||0, pl = parseFloat(cs.paddingLeft)||0;
    if (pt) { makeBox(rect.left, rect.top, rect.width, pt, 'padding'); makeLabel(rect.left+4, rect.top+2, spLabel(pt,spMap)||pt+'px', 'padding', {el:el,prop:'paddingTop',val:pt}); }
    if (pb) { makeBox(rect.left, rect.bottom-pb, rect.width, pb, 'padding'); makeLabel(rect.left+4, rect.bottom-pb+2, spLabel(pb,spMap)||pb+'px', 'padding', {el:el,prop:'paddingBottom',val:pb}); }
    if (pl) { makeBox(rect.left, rect.top+pt, pl, rect.height-pt-pb, 'padding'); makeLabel(rect.left+2, rect.top+pt+2, spLabel(pl,spMap)||pl+'px', 'padding', {el:el,prop:'paddingLeft',val:pl}); }
    if (pr) { makeBox(rect.right-pr, rect.top+pt, pr, rect.height-pt-pb, 'padding'); makeLabel(rect.right-pr+2, rect.top+pt+2, spLabel(pr,spMap)||pr+'px', 'padding', {el:el,prop:'paddingRight',val:pr}); }

    // Gap from flex/grid parent
    var parent = el.parentElement;
    if (parent) {
      var pcs = getComputedStyle(parent);
      var pdisplay = pcs.display;
      if (pdisplay === 'flex' || pdisplay === 'grid' || pdisplay === 'inline-flex' || pdisplay === 'inline-grid') {
        var rowGapVal = parseFloat(pcs.rowGap) || 0;
        var colGapVal = parseFloat(pcs.columnGap) || 0;

        var nextSib = el.nextElementSibling;
        if (nextSib && nextSib !== panel) {
          var nextR = nextSib.getBoundingClientRect();
          var vertSpace = nextR.top - rect.bottom;
          var horizSpace = nextR.left - rect.right;
          // Vertical gap (row)
          if (vertSpace > 0 && rowGapVal > 0) {
            makeBox(rect.left, rect.bottom, rect.width, rowGapVal, 'gap');
            makeLabel(rect.left+4, rect.bottom+2, spLabel(rowGapVal,spMap)||Math.round(rowGapVal)+'px', 'gap', {el:parent,prop:'rowGap',val:rowGapVal});
          }
          // Horizontal gap (column)
          if (horizSpace > 0 && colGapVal > 0) {
            makeBox(rect.right, rect.top, colGapVal, rect.height, 'gap');
            makeLabel(rect.right+2, rect.top+2, spLabel(colGapVal,spMap)||Math.round(colGapVal)+'px', 'gap', {el:parent,prop:'columnGap',val:colGapVal});
          }
        }
        // Also above (prev sibling)
        var prevSib = el.previousElementSibling;
        if (prevSib) {
          var prevR = prevSib.getBoundingClientRect();
          var vertAbove = rect.top - prevR.bottom;
          var horizLeft = rect.left - prevR.right;
          if (vertAbove > 0 && rowGapVal > 0) {
            makeBox(rect.left, rect.top - rowGapVal, rect.width, rowGapVal, 'gap');
            makeLabel(rect.left+4, rect.top - rowGapVal + 2, spLabel(rowGapVal,spMap)||Math.round(rowGapVal)+'px', 'gap', {el:parent,prop:'rowGap',val:rowGapVal});
          }
          if (horizLeft > 0 && colGapVal > 0) {
            makeBox(prevR.right, rect.top, colGapVal, rect.height, 'gap');
            makeLabel(prevR.right+2, rect.top+2, spLabel(colGapVal,spMap)||Math.round(colGapVal)+'px', 'gap', {el:parent,prop:'columnGap',val:colGapVal});
          }
        }
      }
    }

    // Gap inside this element if it's a flex/grid container
    var display = cs.display;
    if (display === 'flex' || display === 'grid' || display === 'inline-flex' || display === 'inline-grid') {
      var isColSelf = cs.flexDirection === 'column' || cs.flexDirection === 'column-reverse';
      var selfGap = isColSelf ? (parseFloat(cs.rowGap)||0) : (parseFloat(cs.columnGap)||0);
      if (selfGap > 0) {
        var kids = Array.from(el.children).filter(function(c){ return !c.closest('#dp') && isVisible(c); });
        for (var i = 0; i < kids.length - 1; i++) {
          var k1 = kids[i].getBoundingClientRect();
          var k2 = kids[i+1].getBoundingClientRect();
          var gs = isColSelf ? k1.bottom : k1.right;
          var ge = isColSelf ? k2.top : k2.left;
          if (ge - gs < 1) continue;
          var kgx = isColSelf ? k1.left : gs;
          var kgy = isColSelf ? gs : k1.top;
          var kgw = isColSelf ? k1.width : ge - gs;
          var kgh = isColSelf ? ge - gs : k1.height;
          makeBox(kgx, kgy, kgw, kgh, 'gap');
          makeLabel(kgx+4, kgy+2, spLabel(selfGap,spMap)||Math.round(selfGap)+'px', 'gap', {el:el,prop:'gap',val:selfGap});
        }
      }
    }

    // Margin gap to next block sibling
    var nextEl = el.nextElementSibling;
    if (nextEl && nextEl !== panel && !nextEl.closest('#dp')) {
      var nmt = parseFloat(getComputedStyle(nextEl).marginTop)||0;
      var nextR2 = nextEl.getBoundingClientRect();
      var visualGap = nextR2.top - rect.bottom;
      if (visualGap > 1 && nmt > 0 && Math.abs(visualGap - nmt) < 10) {
        makeBox(rect.left, rect.bottom, rect.width, visualGap, 'gap');
        makeLabel(rect.left+4, rect.bottom+2, spLabel(nmt,spMap)||Math.round(nmt)+'px', 'gap', {el:nextEl,prop:'marginTop',val:nmt});
      }
    }

    // Ancestor padding — walk up and show padding on parent containers
    var stopTags = {'BODY':1,'HTML':1};
    var anc = el.parentElement;
    var depth = 0;
    while (anc && !stopTags[anc.tagName] && depth < 4) {
      if (anc.closest('#dp') || anc.closest('#dp-tab')) break;
      var acs = getComputedStyle(anc);
      var ar = anc.getBoundingClientRect();
      var apt = parseFloat(acs.paddingTop)||0;
      var apb = parseFloat(acs.paddingBottom)||0;
      var apl = parseFloat(acs.paddingLeft)||0;
      var apr = parseFloat(acs.paddingRight)||0;
      if (apt || apb || apl || apr) {
        if (apt) { makeBox(ar.left, ar.top, ar.width, apt, 'padding'); makeLabel(ar.left+4, ar.top+2, spLabel(apt,spMap)||Math.round(apt)+'px', 'padding', {el:anc,prop:'paddingTop',val:apt}); }
        if (apb) { makeBox(ar.left, ar.bottom-apb, ar.width, apb, 'padding'); makeLabel(ar.left+4, ar.bottom-apb+2, spLabel(apb,spMap)||Math.round(apb)+'px', 'padding', {el:anc,prop:'paddingBottom',val:apb}); }
        if (apl) { makeBox(ar.left, ar.top+apt, apl, ar.height-apt-apb, 'padding'); makeLabel(ar.left+2, ar.top+apt+2, spLabel(apl,spMap)||Math.round(apl)+'px', 'padding', {el:anc,prop:'paddingLeft',val:apl}); }
        if (apr) { makeBox(ar.right-apr, ar.top+apt, apr, ar.height-apt-apb, 'padding'); makeLabel(ar.right-apr+2, ar.top+apt+2, spLabel(apr,spMap)||Math.round(apr)+'px', 'padding', {el:anc,prop:'paddingRight',val:apr}); }
        depth++;
      }
      anc = anc.parentElement;
    }
  }

  var spScrollRAF = null;

  function onSpaceMouseMove(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    // Don't re-render when hovering a label in the overlay — lets the user click it
    if (el && el.closest('#dp-sp-overlay')) return;
    while (el && (el.closest('#dp') || el.closest('#dp-tab') || el.closest('#dp-type-overlay'))) {
      el = el.parentElement;
    }
    if (el === spTarget) return;
    spTarget = el;
    renderSpaceOverlay(el);
  }

  function onSpaceScroll() {
    if (spScrollRAF) cancelAnimationFrame(spScrollRAF);
    spScrollRAF = requestAnimationFrame(function() { renderSpaceOverlay(spTarget); });
  }

  function startSpaceInspect() {
    spaceInspectOn = true;
    spOverlay = document.createElement('div');
    spOverlay.id = 'dp-sp-overlay';
    document.body.appendChild(spOverlay);
    document.addEventListener('mousemove', onSpaceMouseMove);
    window.addEventListener('scroll', onSpaceScroll, true);
  }

  function stopSpaceInspect() {
    spaceInspectOn = false;
    spTarget = null;
    if (spOverlay) { spOverlay.remove(); spOverlay = null; }
    closeSpacePicker();
    document.removeEventListener('mousemove', onSpaceMouseMove);
    window.removeEventListener('scroll', onSpaceScroll, true);
  }

  panel.querySelector('#dp-btn-space').addEventListener('click', function() {
    spaceInspectOn ? stopSpaceInspect() : startSpaceInspect();
    this.classList.toggle('active', spaceInspectOn);
    // turn off type if on
    if (spaceInspectOn && typeInspectOn) {
      stopTypeInspect();
      panel.querySelector('#dp-btn-type').classList.remove('active');
    }
  });

  // ── Save to CSS ───────────────────────────────────────────────────────────────
  var cssFileHandle = null;

  panel.querySelector('#dp-save').addEventListener('click', async function(){
    if (!Object.keys(overrides).length) return;
    var msg = panel.querySelector('#dp-copied');

    try {
      // Pick styles.css once, reuse the handle after that
      if (!cssFileHandle) {
        cssFileHandle = await window.showOpenFilePicker({
          id: 'dp-styles',
          startIn: 'documents',
          types: [{ description: 'CSS', accept: { 'text/css': ['.css'] } }],
        }).then(function(handles){ return handles[0]; });
      }

      // Read current file contents
      var file = await cssFileHandle.getFile();
      var text = await file.text();

      // For each override, update the token value inside the :root block
      Object.keys(overrides).forEach(function(token) {
        var val = overrides[token];
        // Match the token inside :root { ... } — replace its value
        var re = new RegExp('(' + token.replace(/[-]/g, '\\-') + '\\s*:)[^;]*(;)', 'g');
        if (re.test(text)) {
          text = text.replace(re, '$1 ' + val + '$2');
        } else {
          // Token not found — insert before closing brace of first :root block
          text = text.replace(/(:root\s*\{[^}]*)(\})/, '$1  ' + token + ': ' + val + ';\n$2');
        }
      });

      // Write back
      var writable = await cssFileHandle.createWritable();
      await writable.write(text);
      await writable.close();

      msg.textContent = 'Saved!';
      msg.style.display = 'inline';
      setTimeout(function(){ msg.style.display = 'none'; msg.textContent = 'Copied!'; }, 2000);

    } catch(e) {
      if (e.name !== 'AbortError') {
        msg.textContent = 'Error!';
        msg.style.display = 'inline';
        setTimeout(function(){ msg.style.display = 'none'; msg.textContent = 'Copied!'; }, 2000);
        cssFileHandle = null;
      }
    }
  });

  // ── Reset ─────────────────────────────────────────────────────────────────────
  panel.querySelector('#dp-reset').addEventListener('click', function(){
    Object.keys(overrides).forEach(function(k){ root.style.removeProperty(k); });
    overrides = {}; build();
  });

  // ── Toggle ────────────────────────────────────────────────────────────────────
  function open()  { panel.classList.add('open'); tab.classList.add('open'); build(); }
  function close() { panel.classList.remove('open'); tab.classList.remove('open'); stopTypeInspect(); stopSpaceInspect(); panel.querySelector('#dp-btn-type').classList.remove('active'); panel.querySelector('#dp-btn-space').classList.remove('active'); }
  tab.addEventListener('click', function(){ panel.classList.contains('open') ? close() : open(); });
  panel.querySelector('#dp-close').addEventListener('click', close);
  document.addEventListener('keydown', function(e){ if (e.key==='`') panel.classList.contains('open') ? close() : open(); });
})();
