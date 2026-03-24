const LedsModule = (function() {
    let unsubscribe = null;
    function init() {
        console.log('LedsModule stub');
        unsubscribe = AppState.subscribe(()=>{});
    }
    function destroy() {
        if (unsubscribe) unsubscribe();
    }
    return { init, destroy };
})();
