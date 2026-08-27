// === PROŠLO MJERENJE MODAL ===
// Gumb "Pogledaj prošlo mjerenje" u formi odušnika

function getPreviousMeasurementData(ventName) {
  const allMeasurements = loadMeasurements();
  const currentId = state.selectedLandfill && state.selectedLandfill.id;
  const currentName = state.selectedLandfill && state.selectedLandfill.name;

  const landfillMeasurements = allMeasurements.filter(function(m) {// === PROŠLO MJERENJE MODAL ===
// Gumb "Pogledaj prošlo mjerenje" u formi odušnika

function getPreviousMeasurementData(ventName) {
  const allMeasurements = loadMeasurements();
  const currentId = state.selectedLandfill && state.selectedLandfill.id;
  const currentName = state.selectedLandfill && state.selectedLandfill.name;

  const landfillMeasurements = allMeasurements.filter(function(m) {
    var mId = m.landfill && m.landfill.id;
    var mName = m.landfill && m.landfill.name;
    var same = (currentId && mId && mId === currentId) || (currentName && mName && mName === currentName);
    return same && m.date !== state.currentMeasurement.date;
  }).sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  if (!landfillMeasurements.length) return null;

  var prev = landfillMeasurements[0];
  var prevVent = prev.vents && prev.vents.find(function(v) { return v.name === ventName; });
  if (!prevVent) return null;

  return { measurement: prev, vent: prevVent };
}

var _prevVentData = null;

function showPrevMeasurementModal() {
  var ventName = document.getElementById('vent-name').value;
  if (!ventName) return;

  var data = getPreviousMeasurementData(ventName);
  _prevVentData = data ? data.vent : null;

  var modal = document.getElementById('prev-measurement-modal');
  var content = document.getElementById('prev-measurement-content');

  if (!data) {
    content.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Nema prethodnih mjerenja za odušnik <strong>' + ventName + '</strong></p>';
  } else {
    var v = data.vent;
    var m = data.measurement;
    var date = m.date ? m.date.split('-').reverse().join('.') : '-';
    var status = v.status === 'measured' ? '✅ Izmjeren' : '⛔ Nije izmjeren';

    var rows = [
      { label: 'CH₄', value: v.ch4, unit: '%' },
      { label: 'CO₂', value: v.co2, unit: '%' },
      { label: 'O₂',  value: v.o2,  unit: '%' },
      { label: 'H₂',  value: v.h2,  unit: 'ppm' },
      { label: 'H₂S', value: v.h2s, unit: 'ppm' },
      { label: 'Temp',value: v.temp, unit: '°C' },
    ];

    var grid = rows.map(function(r) {
      var val = (r.value !== null && r.value !== undefined && r.value !== '') ? r.value + ' ' + r.unit : '-';
      return '<div style="background:#f5f5f5;border-radius:8px;padding:12px;text-align:center;">' +
        '<div style="font-size:12px;color:#666;margin-bottom:4px;">' + r.label + '</div>' +
        '<div style="font-size:20px;font-weight:700;color:#333;">' + val + '</div>' +
        '</div>';
    }).join('');

    var note = v.note ? '<div style="margin-top:12px;padding:10px;background:#fff3cd;border-radius:6px;font-size:13px;"><strong>Napomena:</strong> ' + v.note + '</div>' : '';

    content.innerHTML =
      '<div style="text-align:center;margin-bottom:15px;">' +
        '<div style="font-size:22px;font-weight:700;color:#2e7d32;">Odušnik ' + ventName + '</div>' +
        '<div style="color:#666;font-size:14px;">Mjerenje od ' + date + ' &bull; ' + (m.measurer || '-') + '</div>' +
        '<div style="margin-top:4px;font-size:13px;">' + status + '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">' + grid + '</div>' +
      note +
      '<button type="button" onclick="copyPrevMeasurement()" style="margin-top:15px;background:#2e7d32;width:100%;font-size:15px;padding:13px;">📋 Kopiraj vrijednosti u formu</button>';
  }

  modal.style.display = 'flex';
}

function closePrevMeasurementModal() {
  document.getElementById('prev-measurement-modal').style.display = 'none';
}

function copyPrevMeasurement() {
  if (!_prevVentData) return;
  var v = _prevVentData;
  if (v.ch4  !== null && v.ch4  !== undefined && v.ch4  !== '') document.getElementById('ch4').value  = v.ch4;
  if (v.co2  !== null && v.co2  !== undefined && v.co2  !== '') document.getElementById('co2').value  = v.co2;
  if (v.o2   !== null && v.o2   !== undefined && v.o2   !== '') document.getElementById('o2').value   = v.o2;
  if (v.h2   !== null && v.h2   !== undefined && v.h2   !== '') document.getElementById('h2').value   = v.h2;
  if (v.h2s  !== null && v.h2s  !== undefined && v.h2s  !== '') document.getElementById('h2s').value  = v.h2s;
  if (v.temp !== null && v.temp !== undefined && v.temp !== '') document.getElementById('vent-temp').value = v.temp;
  if (v.note) document.getElementById('vent-note').value = v.note;
  // Postavi status
  if (v.status) {
    var radio = document.querySelector('input[name="vent-status"][value="' + v.status + '"]');
    if (radio) radio.checked = true;
  }
  if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
  closePrevMeasurementModal();
}

// Pokaži/sakrij gumb ovisno o tome postoji li prošlo mjerenje
function updatePrevMeasurementBtn(ventName) {
  var btn = document.getElementById('prev-measurement-btn');
  if (!btn) return;
  var data = getPreviousMeasurementData(ventName);
  btn.style.display = data ? 'block' : 'none';
}

// Zakači na loadPreviousMeasurement - pozovi updatePrevMeasurementBtn
var _origLoadPrev = typeof loadPreviousMeasurement === 'function' ? loadPreviousMeasurement : null;
window.loadPreviousMeasurement = function(ventName) {
  if (_origLoadPrev) _origLoadPrev(ventName);
  updatePrevMeasurementBtn(ventName);
};

    var mId = m.landfill && m.landfill.id;
    var mName = m.landfill && m.landfill.name;
    var same = (currentId && mId && mId === currentId) || (currentName && mName && mName === currentName);
    return same && m.date !== state.currentMeasurement.date;
  }).sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  if (!landfillMeasurements.length) return null;

  var prev = landfillMeasurements[0];
  var prevVent = prev.vents && prev.vents.find(function(v) { return v.name === ventName; });
  if (!prevVent) return null;

  return { measurement: prev, vent: prevVent };
}

var _prevVentData = null;

function showPrevMeasurementModal() {
  var ventName = document.getElementById('vent-name').value;
  if (!ventName) return;

  var data = getPreviousMeasurementData(ventName);
  _prevVentData = data ? data.vent : null;

  var modal = document.getElementById('prev-measurement-modal');
  var content = document.getElementById('prev-measurement-content');

  if (!data) {
    content.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Nema prethodnih mjerenja za odušnik <strong>' + ventName + '</strong></p>';
  } else {
    var v = data.vent;
    var m = data.measurement;
    var date = m.date ? m.date.split('-').reverse().join('.') : '-';
    var status = v.status === 'measured' ? '✅ Izmjeren' : '⛔ Nije izmjeren';

    var rows = [
      { label: 'CH₄', value: v.ch4, unit: '%' },
      { label: 'CO₂', value: v.co2, unit: '%' },
      { label: 'O₂',  value: v.o2,  unit: '%' },
      { label: 'H₂',  value: v.h2,  unit: 'ppm' },
      { label: 'H₂S', value: v.h2s, unit: 'ppm' },
      { label: 'Temp',value: v.temp, unit: '°C' },
    ];

    var grid = rows.map(function(r) {
      var val = (r.value !== null && r.value !== undefined && r.value !== '') ? r.value + ' ' + r.unit : '-';
      return '<div style="background:#f5f5f5;border-radius:8px;padding:12px;text-align:center;">' +
        '<div style="font-size:12px;color:#666;margin-bottom:4px;">' + r.label + '</div>' +
        '<div style="font-size:20px;font-weight:700;color:#333;">' + val + '</div>' +
        '</div>';
    }).join('');

    var note = v.note ? '<div style="margin-top:12px;padding:10px;background:#fff3cd;border-radius:6px;font-size:13px;"><strong>Napomena:</strong> ' + v.note + '</div>' : '';

    content.innerHTML =
      '<div style="text-align:center;margin-bottom:15px;">' +
        '<div style="font-size:22px;font-weight:700;color:#2e7d32;">Odušnik ' + ventName + '</div>' +
        '<div style="color:#666;font-size:14px;">Mjerenje od ' + date + ' &bull; ' + (m.measurer || '-') + '</div>' +
        '<div style="margin-top:4px;font-size:13px;">' + status + '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">' + grid + '</div>' +
      note +
      '<button type="button" onclick="copyPrevMeasurement()" style="margin-top:15px;background:#2e7d32;width:100%;font-size:15px;padding:13px;">📋 Kopiraj vrijednosti u formu</button>';
  }

  modal.style.display = 'flex';
}

function closePrevMeasurementModal() {
  document.getElementById('prev-measurement-modal').style.display = 'none';
}

function copyPrevMeasurement() {
  if (!_prevVentData) return;
  var v = _prevVentData;
  if (v.ch4  !== null && v.ch4  !== undefined && v.ch4  !== '') document.getElementById('ch4').value  = v.ch4;
  if (v.co2  !== null && v.co2  !== undefined && v.co2  !== '') document.getElementById('co2').value  = v.co2;
  if (v.o2   !== null && v.o2   !== undefined && v.o2   !== '') document.getElementById('o2').value   = v.o2;
  if (v.h2   !== null && v.h2   !== undefined && v.h2   !== '') document.getElementById('h2').value   = v.h2;
  if (v.h2s  !== null && v.h2s  !== undefined && v.h2s  !== '') document.getElementById('h2s').value  = v.h2s;
  if (v.temp !== null && v.temp !== undefined && v.temp !== '') document.getElementById('vent-temp').value = v.temp;
  if (v.note) document.getElementById('vent-note').value = v.note;
  // Postavi status
  if (v.status) {
    var radio = document.querySelector('input[name="vent-status"][value="' + v.status + '"]');
    if (radio) radio.checked = true;
  }
  if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
  closePrevMeasurementModal();
}

// Pokaži/sakrij gumb ovisno o tome postoji li prošlo mjerenje
function updatePrevMeasurementBtn(ventName) {
  var btn = document.getElementById('prev-measurement-btn');
  if (!btn) return;
  var data = getPreviousMeasurementData(ventName);
  btn.style.display = data ? 'block' : 'none';
}

// Zakači na loadPreviousMeasurement - pozovi updatePrevMeasurementBtn
var _origLoadPrev = typeof loadPreviousMeasurement === 'function' ? loadPreviousMeasurement : null;
window.loadPreviousMeasurement = function(ventName) {
  if (_origLoadPrev) _origLoadPrev(ventName);
  updatePrevMeasurementBtn(ventName);
};
