// === RENAME VENT ===
// Uredi -> tapni na naziv odušnika -> picker s neizmjerenim odušnicima
// Odabir novog naziva NE sprema odmah - korisnik još može urediti parametre pa stisne Spremi

(function () {

  document.addEventListener('DOMContentLoaded', function () {
    waitAndPatch('editVent', patchEditVent);
    waitAndPatch('saveVentData', patchSaveVent);
    injectPickerUI();
  });

  function waitAndPatch(fnName, patchFn) {
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      if (window[fnName] || attempts > 30) {
        clearInterval(iv);
        if (window[fnName]) patchFn();
      }
    }, 200);
  }

  // --- Patch editVent: setup tap on name field ---
  function patchEditVent() {
    var orig = window.editVent;
    window.editVent = function (index) {
      orig.call(this, index);
      setTimeout(function () { setupNameTap(index); }, 120);
    };
  }

  function setupNameTap(editIdx) {
    var inp = document.getElementById('vent-name');
    if (!inp) return;
    inp.style.cursor = 'pointer';
    inp.style.borderBottom = '2px solid var(--primary,#2e7d32)';
    inp.title = 'Tapni za odabir drugog odušnika';
    inp.removeEventListener('click', inp._rvH);
    inp._rvH = function (e) { e.preventDefault(); e.stopPropagation(); openPicker(editIdx); };
    inp.addEventListener('click', inp._rvH);
  }

  function teardown() {
    var inp = document.getElementById('vent-name');
    if (!inp) return;
    inp.style.cursor = '';
    inp.style.borderBottom = '';
    inp.title = '';
    if (inp._rvH) { inp.removeEventListener('click', inp._rvH); inp._rvH = null; }
    window._pendingRenameIdx = undefined;
    window._pendingRenameName = undefined;
  }

  // Teardown when new vent opened (not edit)
  document.addEventListener('click', function (e) {
    if (!e.target) return;
    var id = e.target.id;
    if (id === 'vent-select-confirm' || id === 'manual-vent-confirm') setTimeout(teardown, 150);
  });

  // --- Patch saveVentData: apply pending rename before saving ---
  function patchSaveVent() {
    var orig = window.saveVentData;
    window.saveVentData = function () {
      // Ako je naziv promijenjen kroz picker, naziv je već u input polju
      // Samo resetiraj pending state i pozovi original
      window._pendingRenameIdx = undefined;
      window._pendingRenameName = undefined;
      orig.call(this);
      teardown();
    };
  }

  // --- Picker UI ---
  function injectPickerUI() {
    var el = document.createElement('div');
    el.id = 'rv-picker';
    el.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:7000;align-items:center;justify-content:center;';
    el.innerHTML =
      '<div style="background:var(--card-bg,#fff);border-radius:14px;padding:20px 16px;max-width:340px;width:93%;max-height:75vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.3);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
          '<span style="font-weight:700;font-size:16px;color:var(--primary,#2e7d32);">🔄 Zamijeni odušnik</span>' +
          '<button id="rv-close-btn" style="background:none;border:none;font-size:24px;cursor:pointer;color:#aaa;line-height:1;">✕</button>' +
        '</div>' +
        '<p style="font-size:12px;color:var(--secondary-text,#888);margin-bottom:10px;">Odaberi neizmjereni odušnik s kojim ćeš zamijeniti trenutni.</p>' +
        '<div id="rv-list" style="overflow-y:auto;flex:1;"></div>' +
      '</div>';
    document.body.appendChild(el);
    document.getElementById('rv-close-btn').addEventListener('click', closePicker);
    el.addEventListener('click', function (e) { if (e.target === el) closePicker(); });
  }

  var _editIdx = -1;

  function openPicker(editIdx) {
    _editIdx = editIdx;

    var landfillId = null;
    if (window.state) {
      var sl = window.state.selectedLandfill;
      var ml = window.state.currentMeasurement && window.state.currentMeasurement.landfill;
      landfillId = (sl && sl.id) || (ml && ml.id);
    }

    var allVents = [];
    if (window.VENTS_BY_LANDFILL && landfillId) {
      allVents = window.VENTS_BY_LANDFILL[landfillId] ||
                 window.VENTS_BY_LANDFILL[parseInt(landfillId)] || [];
    }

    var vents = (window.state && window.state.currentMeasurement && window.state.currentMeasurement.vents) || [];
    var measuredNames = vents.map(function (v) { return v.name; });
    var currentName = (vents[editIdx] || {}).name || '';

    var unmeasured = allVents.filter(function (n) {
      return n !== currentName && measuredNames.indexOf(n) < 0;
    });

    var list = document.getElementById('rv-list');
    if (!list) return;

    if (unmeasured.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:24px;color:#aaa;font-size:14px;">Svi odušnici su već izmjereni.<br>Nema dostupnih za zamjenu.</div>';
    } else {
      list.innerHTML = unmeasured.map(function (name) {
        return '<div data-n="' + name.replace(/"/g, '&quot;') + '" style="padding:14px 12px;border-bottom:1px solid var(--table-border,#eee);cursor:pointer;font-size:15px;font-weight:600;color:var(--text-color,#333);border-radius:6px;margin-bottom:2px;">' + name + '</div>';
      }).join('');
      list.querySelectorAll('[data-n]').forEach(function (row) {
        row.addEventListener('mouseover', function () { row.style.background = 'var(--hover-bg,#f5f5f5)'; });
        row.addEventListener('mouseout', function () { row.style.background = ''; });
        row.addEventListener('click', function () { applyRename(row.getAttribute('data-n')); });
      });
    }

    document.getElementById('rv-picker').style.display = 'flex';
  }

  function closePicker() {
    document.getElementById('rv-picker').style.display = 'none';
    _editIdx = -1;
  }

  function applyRename(newName) {
    if (_editIdx < 0) { closePicker(); return; }

    // Upiši novi naziv u input polje - forma ostaje otvorena
    var inp = document.getElementById('vent-name');
    if (inp) {
      inp.value = newName;
      inp.style.borderBottom = '2px solid var(--secondary,#ff9800)';
      inp.title = 'Naziv promijenjen – stisni Spremi odušnik za potvrdu';
    }

    closePicker();
    // Forma ostaje otvorena - korisnik može još urediti parametre
  }

})();
