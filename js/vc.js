// vc.js
const VcModule = (function() {
    let unsubscribe = null;
    function init() {
        console.log('VcModule stub');
        unsubscribe = AppState.subscribe(()=>{});
    }
    function destroy() {
        if (unsubscribe) unsubscribe();
    }
    return { init, destroy };
})();
