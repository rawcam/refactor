// sound.js
const SoundModule = (function() {
    let unsubscribe = null;
    function init() {
        console.log('SoundModule stub');
        unsubscribe = AppState.subscribe(()=>{});
    }
    function destroy() {
        if (unsubscribe) unsubscribe();
    }
    return { init, destroy };
})();
