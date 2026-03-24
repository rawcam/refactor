// sound.js
const SoundModule = (function() {
    let unsubscribe = null;

    // Вспомогательная функция для обновления интерфейса в зависимости от режима
    function renderCalculator(mode) {
        const state = AppState.getState();
        const soundConfig = state.soundConfig;
        const container = document.getElementById('soundCalculatorContainer');
        if (!container) return;

        let html = '';
        if (mode === 'spl') {
            html = `
                <div class="calc-card">
                    <h3><i class="fas fa-volume-up"></i> Расчёт уровня звукового давления (SPL) на расстоянии</h3>
                    <div class="setting"><label>Чувствительность (дБ/1Вт/1м):</label><input type="number" id="splSensitivity" value="${soundConfig.sensitivity}" step="1"></div>
                    <div class="setting"><label>Мощность источника (Вт):</label><input type="number" id="splPower" value="${soundConfig.sourcePower}" step="0.5" min="0.1"></div>
                    <div class="setting"><label>Расстояние до источника (м):</label><input type="number" id="splDistance" value="${soundConfig.distance}" step="0.5" min="0.1"></div>
                    <div class="setting"><label>Запас headroom (дБ):</label><input type="number" id="splHeadroom" value="${soundConfig.headroom}" step="1"></div>
                    <div class="setting"><label>Помещение (дБ):</label><input type="number" id="splRoom" value="${soundConfig.roomGain}" step="1"></div>
                    <div class="widget-item"><span class="widget-label"><i class="fas fa-volume-up"></i> SPL на расстоянии:</span><span class="widget-value" id="splResultValue">—</span> дБ</div>
                    <div class="ergo-info">Формула: SPL = чувствительность + 10·lg(мощность) – 20·lg(расстояние) + headroom + помещение.</div>
                </div>
            `;
        } else if (mode === 'drop') {
            html = `
                <div class="calc-card">
                    <h3><i class="fas fa-chart-line"></i> Падение звукового давления от расстояния</h3>
                    <div class="setting"><label>Тип источника:</label><select id="dropSourceType"><option value="point" ${soundConfig.sourceType==='point'?'selected':''}>Точечный</option><option value="line" ${soundConfig.sourceType==='line'?'selected':''}>Линейный массив</option></select></div>
                    <div class="setting"><label>Начальное расстояние (м):</label><input type="number" id="dropStart" value="${soundConfig.startDistance}" step="0.5" min="0.1"></div>
                    <div class="setting"><label>Конечное расстояние (м):</label><input type="number" id="dropEnd" value="${soundConfig.endDistance}" step="0.5" min="0.1"></div>
                    <div class="widget-item"><span class="widget-label"><i class="fas fa-chart-line"></i> Падение SPL:</span><span class="widget-value" id="dropResultValue">—</span> дБ</div>
                    <div class="ergo-info">Для точечного: Δ = 20·lg(R2/R1); для линейного: Δ = 10·lg(R2/R1). Удвоение расстояния: точечный –6 дБ, линейный –3 дБ.</div>
                </div>
            `;
        } else if (mode === 'power') {
            html = `
                <div class="calc-card">
                    <h3><i class="fas fa-bolt"></i> Изменение уровня звукового давления при изменении мощности</h3>
                    <div class="setting"><label>Мощность 1 (Вт):</label><input type="number" id="powerFromVal" value="${soundConfig.powerChangeFrom}" step="0.5" min="0.1"></div>
                    <div class="setting"><label>Мощность 2 (Вт):</label><input type="number" id="powerToVal" value="${soundConfig.powerChangeTo}" step="0.5" min="0.1"></div>
                    <div class="widget-item"><span class="widget-label"><i class="fas fa-chart-line"></i> Изменение SPL:</span><span class="widget-value" id="powerChangeResultValue">—</span> дБ</div>
                    <div class="ergo-info">Формула: Δ = 10·lg(P2/P1). Удвоение мощности → +3 дБ, увеличение в 10 раз → +10 дБ.</div>
                </div>
            `;
        } else if (mode === 'rt60') {
            html = `
                <div class="calc-card">
                    <h3><i class="fas fa-hourglass-half"></i> Время реверберации RT60 (формула Сэбина)</h3>
                    <div class="setting"><label>Объём помещения (м³):</label><input type="number" id="rt60Volume" value="${soundConfig.roomVolume}" step="10" min="1"></div>
                    <div class="setting"><label>Площадь поверхностей (м²):</label><input type="number" id="rt60Area" value="${soundConfig.roomArea}" step="10" min="1"></div>
                    <div class="setting"><label>Средний коэффициент поглощения α:</label><input type="number" id="rt60Alpha" value="${soundConfig.avgAbsorption}" step="0.01" min="0.01" max="1"></div>
                    <div class="widget-item"><span class="widget-label"><i class="fas fa-hourglass-half"></i> RT60:</span><span class="widget-value" id="rt60Result">—</span> с</div>
                    <div class="ergo-info">RT60 = 0.161 * V / (A), где A = α * S. Рекомендации: конференц-зал 0.6–0.8 с, лекционный зал 0.8–1.2 с, театр 1.2–1.5 с.</div>
                </div>
            `;
        } else if (mode === 'speakers') {
            html = `
                <div class="calc-card">
                    <h3><i class="fas fa-microphone-alt"></i> Подбор потолочных громкоговорителей</h3>
                    <div class="setting"><label>Длина помещения (м):</label><input type="number" id="spkLength" value="${soundConfig.roomLength}" step="0.5" min="1"></div>
                    <div class="setting"><label>Ширина помещения (м):</label><input type="number" id="spkWidth" value="${soundConfig.roomWidth}" step="0.5" min="1"></div>
                    <div class="setting"><label>Высота потолка (м):</label><input type="number" id="spkHeight" value="${soundConfig.roomHeight}" step="0.1" min="2"></div>
                    <div class="setting"><label>Мощность одного громкоговорителя (Вт):</label><input type="number" id="spkPower" value="${soundConfig.speakerPower}" step="5" min="1"></div>
                    <div class="setting"><label>Чувствительность громкоговорителя (дБ/1Вт/1м):</label><input type="number" id="spkSens" value="${soundConfig.speakerSensitivity}" step="1" min="70"></div>
                    <div class="setting"><label>Требуемый SPL (дБ):</label><input type="number" id="spkRequiredSPL" value="${soundConfig.requiredSPL}" step="1" min="60"></div>
                    <div class="result-grid">
                        <div class="result-item"><div class="result-label">Площадь помещения</div><div class="result-value" id="spkArea">—</div><div>м²</div></div>
                        <div class="result-item"><div class="result-label">Кол-во громкоговорителей</div><div class="result-value" id="spkCount">—</div><div>шт</div></div>
                        <div class="result-item"><div class="result-label">Общая мощность</div><div class="result-value" id="spkTotalPower">—</div><div>Вт</div></div>
                        <div class="result-item"><div class="result-label">SPL в центре зоны</div><div class="result-value" id="spkSPL">—</div><div>дБ</div></div>
                    </div>
                    <div class="ergo-info">Рекомендуемое расстояние между потолочными громкоговорителями: ~1.5 × высота потолка. Расчёт приблизительный.</div>
                </div>
            `;
        }

        container.innerHTML = html;
        attachEventHandlers(mode);
        updateCalculations(mode, true); // true – не вызывать setState при первом рендере
    }

    function attachEventHandlers(mode) {
        const inputs = document.querySelectorAll('#soundCalculatorContainer input, #soundCalculatorContainer select');
        inputs.forEach(el => {
            el.removeEventListener('input', () => updateCalculations(mode));
            el.removeEventListener('change', () => updateCalculations(mode));
            el.addEventListener('input', () => updateCalculations(mode));
            el.addEventListener('change', () => updateCalculations(mode));
        });
    }

    function updateCalculations(mode, skipSetState = false) {
        const state = AppState.getState();
        let soundConfig = { ...state.soundConfig };
        let changed = false;

        if (mode === 'spl') {
            const sens = parseFloat(document.getElementById('splSensitivity')?.value) || 0;
            const power = parseFloat(document.getElementById('splPower')?.value) || 0;
            const dist = parseFloat(document.getElementById('splDistance')?.value) || 0;
            const head = parseFloat(document.getElementById('splHeadroom')?.value) || 0;
            const room = parseFloat(document.getElementById('splRoom')?.value) || 0;
            let spl = sens + 10 * Math.log10(power) - 20 * Math.log10(dist) + head + room;
            document.getElementById('splResultValue').innerText = spl.toFixed(1);
            if (soundConfig.sensitivity !== sens) { soundConfig.sensitivity = sens; changed = true; }
            if (soundConfig.sourcePower !== power) { soundConfig.sourcePower = power; changed = true; }
            if (soundConfig.distance !== dist) { soundConfig.distance = dist; changed = true; }
            if (soundConfig.headroom !== head) { soundConfig.headroom = head; changed = true; }
            if (soundConfig.roomGain !== room) { soundConfig.roomGain = room; changed = true; }
        } else if (mode === 'drop') {
            const type = document.getElementById('dropSourceType')?.value;
            const start = parseFloat(document.getElementById('dropStart')?.value) || 0;
            const end = parseFloat(document.getElementById('dropEnd')?.value) || 0;
            let drop = type === 'point' ? 20 * Math.log10(end/start) : 10 * Math.log10(end/start);
            document.getElementById('dropResultValue').innerText = drop.toFixed(1);
            if (soundConfig.sourceType !== type) { soundConfig.sourceType = type; changed = true; }
            if (soundConfig.startDistance !== start) { soundConfig.startDistance = start; changed = true; }
            if (soundConfig.endDistance !== end) { soundConfig.endDistance = end; changed = true; }
        } else if (mode === 'power') {
            const p1 = parseFloat(document.getElementById('powerFromVal')?.value) || 0;
            const p2 = parseFloat(document.getElementById('powerToVal')?.value) || 0;
            let change = 10 * Math.log10(p2/p1);
            document.getElementById('powerChangeResultValue').innerText = change.toFixed(1);
            if (soundConfig.powerChangeFrom !== p1) { soundConfig.powerChangeFrom = p1; changed = true; }
            if (soundConfig.powerChangeTo !== p2) { soundConfig.powerChangeTo = p2; changed = true; }
        } else if (mode === 'rt60') {
            const V = parseFloat(document.getElementById('rt60Volume')?.value) || 1;
            const S = parseFloat(document.getElementById('rt60Area')?.value) || 1;
            const alpha = parseFloat(document.getElementById('rt60Alpha')?.value) || 0.01;
            const A = alpha * S;
            const rt60 = (0.161 * V) / A;
            document.getElementById('rt60Result').innerText = rt60.toFixed(2);
            if (soundConfig.roomVolume !== V) { soundConfig.roomVolume = V; changed = true; }
            if (soundConfig.roomArea !== S) { soundConfig.roomArea = S; changed = true; }
            if (soundConfig.avgAbsorption !== alpha) { soundConfig.avgAbsorption = alpha; changed = true; }
        } else if (mode === 'speakers') {
            const L = parseFloat(document.getElementById('spkLength')?.value) || 1;
            const W = parseFloat(document.getElementById('spkWidth')?.value) || 1;
            const H = parseFloat(document.getElementById('spkHeight')?.value) || 2;
            const powerSpk = parseFloat(document.getElementById('spkPower')?.value) || 1;
            const sensSpk = parseFloat(document.getElementById('spkSens')?.value) || 90;
            const area = L * W;
            const step = 1.5 * H;
            const cols = Math.ceil(L / step);
            const rows = Math.ceil(W / step);
            let count = cols * rows;
            if (count < 1) count = 1;
            const totalPower = count * powerSpk;
            let splAtListener = sensSpk + 10 * Math.log10(powerSpk) - 20 * Math.log10(H);
            document.getElementById('spkArea').innerText = area.toFixed(1);
            document.getElementById('spkCount').innerText = count;
            document.getElementById('spkTotalPower').innerText = totalPower;
            document.getElementById('spkSPL').innerText = splAtListener.toFixed(1);
            if (soundConfig.roomLength !== L) { soundConfig.roomLength = L; changed = true; }
            if (soundConfig.roomWidth !== W) { soundConfig.roomWidth = W; changed = true; }
            if (soundConfig.roomHeight !== H) { soundConfig.roomHeight = H; changed = true; }
            if (soundConfig.speakerPower !== powerSpk) { soundConfig.speakerPower = powerSpk; changed = true; }
            if (soundConfig.speakerSensitivity !== sensSpk) { soundConfig.speakerSensitivity = sensSpk; changed = true; }
        }

        if (!skipSetState && changed) {
            AppState.setState({ soundConfig });
        }
    }

    function showSoundMode(mode) {
        const state = AppState.getState();
        if (state.viewMode === 'sound' && state.soundConfig.activeMode === mode) return;
        state.viewMode = 'sound';
        state.soundConfig.activeMode = mode;
        AppState.setState(state);

        document.getElementById('activePathContainer').style.display = 'none';
        document.getElementById('allTractsContainer').style.display = 'none';
        document.getElementById('ergoCalculatorContainer').style.display = 'none';
        document.getElementById('ledCalculatorContainer').style.display = 'none';
        document.getElementById('vcCalculatorContainer').style.display = 'none';
        const soundContainer = document.getElementById('soundCalculatorContainer');
        soundContainer.style.display = '';

        renderCalculator(mode);
    }

    function init() {
        unsubscribe = AppState.subscribe((newState) => {
            if (newState.viewMode === 'sound' && newState.soundConfig.activeMode) {
                renderCalculator(newState.soundConfig.activeMode);
            }
        });

        const soundModeBtns = document.querySelectorAll('.sound-mode-btn');
        soundModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode) showSoundMode(mode);
            });
        });

        const state = AppState.getState();
        if (state.viewMode === 'sound' && state.soundConfig.activeMode) {
            showSoundMode(state.soundConfig.activeMode);
        }
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
