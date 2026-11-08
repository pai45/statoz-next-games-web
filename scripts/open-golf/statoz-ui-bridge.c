
/* StatOz interface bridge, appended to src/golf/ui.c by
 * scripts/rebuild-open-golf-mobile.py. The HTML shell draws menus, HUD and
 * result screens; these functions report engine state and forward the shell's
 * commands through the upstream transitions. Rules and storage are unchanged. */
#if GOLF_PLATFORM_EMSCRIPTEN
#include <emscripten.h>
#define STATOZ_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define STATOZ_EXPORT
#endif

static int _statoz_num_levels(void) {
    return game_cfg ? (int)CFG_NUM(game_cfg, "num_levels") : 0;
}

STATOZ_EXPORT int statoz_golf_levels(void) {
    return golf ? _statoz_num_levels() : 0;
}

STATOZ_EXPORT int statoz_golf_best(int level) {
    if (!golf || level < 0 || level >= _statoz_num_levels()) return -1;
    char key[64];
    snprintf(key, sizeof(key), "stroke_count_level_%d", level);
    float value;
    return golf_storage_get_num(key, &value) ? (int)value : -1;
}

/* Upstream unlock rule: a hole opens once every earlier hole has a best. */
static bool _statoz_unlocked(int level) {
    if (level < 0 || level >= _statoz_num_levels()) return false;
    for (int i = 0; i < level; i++) {
        if (statoz_golf_best(i) < 0) return false;
    }
    return true;
}

STATOZ_EXPORT int statoz_golf_state(void) { return golf ? (int)golf->state : -1; }
STATOZ_EXPORT int statoz_golf_game_state(void) { return game && golf ? (int)game->state : -1; }
STATOZ_EXPORT int statoz_golf_level(void) { return golf ? golf->level_num : -1; }
STATOZ_EXPORT int statoz_golf_strokes(void) { return game && golf ? game->stroke_count : 0; }
STATOZ_EXPORT int statoz_golf_tutorial(void) { return statoz_tutorial_step; }
STATOZ_EXPORT int statoz_golf_busy(void) { return ui.fade_out.active ? 1 : 0; }

STATOZ_EXPORT float statoz_golf_power(void) {
    if (!game || !golf || game->state != GOLF_GAME_STATE_AIMING) return 0;
    float power = game->aim_line.power;
    return power < 0 ? 0 : (power > 1 ? 1 : power);
}

STATOZ_EXPORT float statoz_golf_since_out_of_bounds(void) {
    if (!game || !golf || game->ball.time_out_of_bounds < 0) return -1;
    return game->t - game->ball.time_out_of_bounds;
}

STATOZ_EXPORT void statoz_golf_click(void) {
    if (golf) golf_audio_start_sound("button_click", "data/audio/drop_003.ogg", 1, false, true);
}

STATOZ_EXPORT int statoz_golf_play(int level) {
    if (!golf || ui.fade_out.active || !_statoz_unlocked(level)) return 0;
    bool from_menu = golf->state == GOLF_STATE_MAIN_MENU;
    bool from_result = golf->state == GOLF_STATE_IN_GAME && game->state == GOLF_GAME_STATE_FINISHED;
    if (!from_menu && !from_result) return 0;
    _golf_ui_start_fade_out(false, true, level, false);
    return 1;
}

STATOZ_EXPORT int statoz_golf_pause(void) {
    if (!golf || ui.fade_out.active || golf->state != GOLF_STATE_IN_GAME) return 0;
    if (game->state != GOLF_GAME_STATE_WAITING_FOR_AIM && game->state != GOLF_GAME_STATE_WATCHING_BALL) return 0;
    golf_game_pause();
    return 1;
}

STATOZ_EXPORT int statoz_golf_resume(void) {
    if (!golf || ui.fade_out.active || golf->state != GOLF_STATE_IN_GAME || game->state != GOLF_GAME_STATE_PAUSED) return 0;
    golf_game_resume();
    return 1;
}

static bool _statoz_menu_open(void) {
    return golf && !ui.fade_out.active && golf->state == GOLF_STATE_IN_GAME &&
        (game->state == GOLF_GAME_STATE_PAUSED || game->state == GOLF_GAME_STATE_FINISHED);
}

STATOZ_EXPORT int statoz_golf_retry(void) {
    if (!_statoz_menu_open()) return 0;
    _golf_ui_start_fade_out(false, false, 0, true);
    return 1;
}

STATOZ_EXPORT int statoz_golf_menu(void) {
    if (!_statoz_menu_open()) return 0;
    _golf_ui_start_fade_out(true, false, 0, false);
    return 1;
}
