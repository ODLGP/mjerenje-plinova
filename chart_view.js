// === GRAFOVI MJERENJA ===
// Dodaje gumb "📊 Grafovi" u povijest mjerenja
// Bar chart za svaki parametar s min/max/avg statistikama

(function () {

  function loadChartJS(cb) {
    if (window.Chart) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function patchHistoryList() {
    var orig = window.updateHistoryList;
    if (!orig) { setTimeout(patchHistoryList, 300); return; }
    window.updateHistoryList = function (filtered) {
      orig.call(this, filtered);
      setTimeout(addChartButtons, 120);
    };
  }

  function addChartButtons() {
    var allM = window.loadMeasurements ? window.loadMeasurements() : [];
    var items = document.querySelectorAll('#history-list .history-item');
    items.forEach(function (item) {
      if (item.querySelector('.chart-btn')) return;
      var btnGroup = item.querySelector('.button-group');
      if (!btnGroup) return;

      // Izračunaj pravi index po datumu i odlagalištu
      var h3 = item.querySelector('h3');
      var ps = item.querySelectorAll('p');
      var name = h3 ? h3.textContent.trim() : '';
      var dateText = '';
      ps.forEach(function (p) {
        if (p.textContent.includes('Datum:')) {
          dateText = p.textContent.replace('Datum:', '').trim();
        }
      });
      var realIdx = allM.findIndex(function (m) {
        return m.landfill && m.landfill.name === name && m.date === dateText;
      });
      if (realIdx < 0) realIdx = allM.length - 1 - Array.from(document.querySelectorAll('#history-list .history-item')).indexOf(item);

      var btn = document.createElement('button');
      btn.className = 'chart-btn';
      btn.style.cssText = 'background:#1565c0;font-size:13px;padding:8px 12px;flex:1;border-radius:6px;';
      btn.textContent = '📊 Grafovi';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openChartModal(realIdx);
      });
      btnGroup.appendChild(btn);
    });
  }

  function injectModal() {
    var modal = document.createElement('div');
    modal.id = 'chart-modal';
    modal.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:8000;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px 10px;';
    modal.innerHTML =
      '<div style="background:var(--card-bg,#fff);border-radius:14px;padding:20px;max-width:860px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.3);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<div>' +
            '<div id="chart-title" style="font-weight:700;font-size:17px;color:var(--primary,#2e7d32);"></div>' +
            '<div id="chart-subtitle" style="font-size:12px;color:var(--secondary-text,#666);margin-top:2px;"></div>' +
          '</div>' +
          '<button id="chart-close-btn" style="background:none;border:none;font-size:26px;cursor:pointer;color:#aaa;line-height:1;padding:4px;">✕</button>' +
        '</div>' +
        '<div id="chart-tabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;"></div>' +
        '<div style="position:relative;height:300px;">' +
          '<canvas id="chart-canvas"></canvas>' +
        '</div>' +
        '<div id="chart-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:14px;"></div>' +
      '</div>';
    document.body.appendChild(modal);
    document.getElementById('chart-close-btn').addEventListener('click', closeChartModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeChartModal(); });
  }

  var _chartInstance = null;
  var _activeParam = 'ch4';
  var _currentM = null;

  var PARAMS = [
    { key: 'ch4',  label: 'CH₄ [%]',   color: '#e53935' },
    { key: 'co2',  label: 'CO₂ [%]',   color: '#1e88e5' },
    { key: 'o2',   label: 'O₂ [%]',    color: '#43a047' },
    { key: 'h2s',  label: 'H₂S [ppm]', color: '#8e24aa' },
    { key: 'h2',   label: 'H₂ [ppm]',  color: '#f4511e' },
    { key: 'temp', label: 'Temp [°C]', color: '#fb8c00' },
  ];

  function openChartModal(idx) {
    var measurements = window.loadMeasurements ? window.loadMeasurements() : [];
    var m = measurements[idx];
    if (!m) return;
    _currentM = m;
    document.getElementById('chart-title').textContent = (m.landfill && m.landfill.name) || 'Mjerenje';
    document.getElementById('chart-subtitle').textContent =
      (m.date || '') + (m.measurer ? '  •  ' + m.measurer : '') + (m.device ? '  •  ' + m.device : '');
    document.getElementById('chart-modal').style.display = 'flex';
    loadChartJS(function () {
      _activeParam = 'ch4';
      renderTabs(m);
      renderChart(m, _activeParam);
    });
  }

  function renderTabs(m) {
    var tabs = document.getElementById('chart-tabs');
    tabs.innerHTML = '';
    PARAMS.forEach(function (p) {
      var hasData = (m.vents || []).some(function (v) {
        return v.status === 'measured' && v[p.key] !== null && v[p.key] !== undefined && v[p.key] !== '';
      });
      if (!hasData) return;
      var btn = document.createElement('button');
      btn.textContent = p.label;
      var isActive = _activeParam === p.key;
      btn.style.cssText = 'padding:6px 14px;border-radius:20px;border:2px solid ' + p.color + ';' +
        'background:' + (isActive ? p.color : 'transparent') + ';' +
        'color:' + (isActive ? 'white' : p.color) + ';' +
        'font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;';
      btn.addEventListener('click', function () {
        _activeParam = p.key;
        renderTabs(m);
        renderChart(m, p.key);
      });
      tabs.appendChild(btn);
    });
  }

  function renderChart(m, param) {
    var paramInfo = PARAMS.find(function (p) { return p.key === param; }) || PARAMS[0];
    var vents = (m.vents || []).filter(function (v) {
      return v.status === 'measured' && v[param] !== null && v[param] !== undefined && v[param] !== '';
    });
    var labels = vents.map(function (v) { return v.name; });
    var data = vents.map(function (v) { return parseFloat(v[param]) || 0; });
    var color = paramInfo.color;

    if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }

    var ctx = document.getElementById('chart-canvas').getContext('2d');
    _chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: paramInfo.label,
          data: data,
          backgroundColor: color + '99',
          borderColor: color,
          borderWidth: 2,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (i) { return i.formattedValue + ' ' + paramInfo.label.split('[')[1].replace(']',''); } } }
        },
        scales: {
          x: { ticks: { font: { size: 11 }, color: 'var(--text-color,#333)' }, grid: { display: false } },
          y: { ticks: { font: { size: 11 }, color: 'var(--text-color,#333)' }, grid: { color: 'var(--table-border,#eee)' }, beginAtZero: true }
        }
      }
    });

    if (data.length > 0) {
      var min = Math.min.apply(null, data).toFixed(2);
      var max = Math.max.apply(null, data).toFixed(2);
      var avg = (data.reduce(function (a, b) { return a + b; }, 0) / data.length).toFixed(2);
      document.getElementById('chart-stats').innerHTML =
        sBox('Minimum', min, color) + sBox('Maksimum', max, color) +
        sBox('Prosjek', avg, color) + sBox('Izmjereno', data.length + '/' + (m.vents || []).length, color);
    } else {
      document.getElementById('chart-stats').innerHTML = '<p style="color:#aaa;text-align:center;padding:10px;">Nema podataka za prikaz.</p>';
    }
  }

  function sBox(label, val, color) {
    return '<div style="background:var(--hover-bg,#f5f5f5);border-radius:8px;padding:10px;text-align:center;border-left:3px solid ' + color + ';">' +
      '<div style="font-size:11px;color:var(--secondary-text,#888);margin-bottom:3px;">' + label + '</div>' +
      '<div style="font-size:18px;font-weight:700;color:var(--text-color,#333);">' + val + '</div>' +
      '</div>';
  }

  function closeChartModal() {
    document.getElementById('chart-modal').style.display = 'none';
    if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectModal();
    patchHistoryList();
  });

})();
