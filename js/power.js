// power.js
const PowerModule = (function() {
    let unsubscribe = null;

    // Типовые мощности кондиционеров в BTU/ч
    const AC_BTU_OPTIONS = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];

    // Расчёт ИБП
    // totalPowerWatts – суммарная активная мощность (Вт)
    // backupHours – желаемое время резервирования (часы)
    // Возвращает рекомендуемую мощность ИБП в ВА и ёмкость батарей в Вт·ч
    function calculateUPS(totalPowerWatts, backupHours) {
        const powerFactor = 0.7;      // типовой коэффициент мощности для ИБП
        const efficiency = 0.9;       // КПД ИБП (допущение)
        const safetyMargin = 1.2;     // запас 20%

        // Полная мощность (ВА) с учётом КПД и запаса
        const va = totalPowerWatts / powerFactor * safetyMargin / efficiency;
        // Энергия, которую должны обеспечить батареи (Вт·ч)
        const batteryWh = totalPowerWatts * backupHours * safetyMargin / efficiency;
        // Рекомендуемый типоразмер ИБП (округление вверх до стандартных значений)
        let recommendedVA = Math.ceil(va / 100) * 100; // округление до сотен ВА
        if (recommendedVA < 500) recommendedVA = 500;
        if (recommendedVA > 10000) recommendedVA = Math.ceil(recommendedVA / 1000) * 1000;
        return {
            recommendedVA: recommendedVA,
            batteryWh: Math.ceil(batteryWh),
            backupHours: backupHours
        };
    }

    // Рекомендация кондиционера по тепловыделению (BTU/ч)
    function recommendAC(btuPerHour) {
        // Если тепловыделение меньше минимального – рекомендуем минимальный
        if (btuPerHour <= AC_BTU_OPTIONS[0]) {
            return AC_BTU_OPTIONS[0];
        }
        // Ищем ближайший сверху типовой размер
        for (let i = 0; i < AC_BTU_OPTIONS.length; i++) {
            if (AC_BTU_OPTIONS[i] >= btuPerHour) {
                return AC_BTU_OPTIONS[i];
            }
        }
        // Если больше максимального – возвращаем максимальный
        return AC_BTU_OPTIONS[AC_BTU_OPTIONS.length - 1];
    }

    function render() {
        const state = AppState.getState();
        const totalPowerWatts = parseFloat(document.getElementById('sidebarTotalPower')?.innerText) || 0;
        const totalBTU = parseFloat(document.getElementById('sidebarTotalBTU')?.innerText) || 0;
        const container = document.getElementById('powerCalculatorContainer');
        if (!container) return;

        // Получаем текущее время резервирования из localStorage (по умолчанию 1 час)
        let backupHours = parseFloat(localStorage.getItem('power_backup_hours')) || 1;

        const upsResult = calculateUPS(totalPowerWatts, backupHours);
        const recommendedAC = recommendAC(totalBTU);

        container.innerHTML = `
            <div class="calc-card">
                <h3><i class="fas fa-battery-full"></i> Подбор ИБП</h3>
                <div class="setting">
                    <label>Время резервирования (часы):</label>
                    <input type="number" id="backupHoursInput" value="${backupHours}" step="0.5" min="0.5" style="width:80px;">
                </div>
                <div class="result-grid">
                    <div class="result-item">
                        <div class="result-label">Рекомендуемая мощность ИБП</div>
                        <div class="result-value">${upsResult.recommendedVA}</div>
                        <div>ВА</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Ёмкость батарей (прибл.)</div>
                        <div class="result-value">${upsResult.batteryWh}</div>
                        <div>Вт·ч</div>
                    </div>
                </div>
                <div class="ergo-info">
                    Расчёт приблизительный. Рекомендуется выбирать ИБП с запасом 20–30%.<br>
                    Учтён КПД ≈ 90%, коэффициент мощности 0.7.
                </div>
            </div>
            <div class="calc-card">
                <h3><i class="fas fa-snowflake"></i> Рекомендация по кондиционеру</h3>
                <div class="widget-item">
                    <span class="widget-label">Тепловыделение (BTU/ч):</span>
                    <span class="widget-value">${totalBTU}</span>
                </div>
                <div class="result-grid">
                    <div class="result-item">
                        <div class="result-label">Рекомендуемая мощность кондиционера</div>
                        <div class="result-value">${recommendedAC}</div>
                        <div>BTU/ч</div>
                    </div>
                </div>
                <div class="ergo-info">
                    Типовые мощности кондиционеров: 9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000 BTU/ч.
                </div>
            </div>
        `;

        const backupInput = document.getElementById('backupHoursInput');
        if (backupInput) {
            backupInput.addEventListener('change', () => {
                const hours = parseFloat(backupInput.value) || 1;
                localStorage.setItem('power_backup_hours', hours);
                render(); // обновляем расчёт
            });
        }
    }

    function init() {
        // Подписываемся на изменения состояния, чтобы перерисовывать при изменении нагрузки
        unsubscribe = AppState.subscribe(() => {
            // Если контейнер видим, обновляем
            const container = document.getElementById('powerCalculatorContainer');
            if (container && container.style.display !== 'none') {
                render();
            }
        });
        // Первоначальный рендер
        render();
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    // Функция для показа/скрытия раздела (будет вызвана из app.js)
    function showPowerCalculator() {
        const state = AppState.getState();
        if (state.viewMode === 'power') return;
        state.viewMode = 'power';
        AppState.setState(state);

        document.getElementById('activePathContainer').style.display = 'none';
        document.getElementById('allTractsContainer').style.display = 'none';
        document.getElementById('ergoCalculatorContainer').style.display = 'none';
        document.getElementById('soundCalculatorContainer').style.display = 'none';
        document.getElementById('ledCalculatorContainer').style.display = 'none';
        document.getElementById('vcCalculatorContainer').style.display = 'none';
        const powerContainer = document.getElementById('powerCalculatorContainer');
        powerContainer.style.display = '';
        render();
    }

    return { init, destroy, showPowerCalculator };
})();
