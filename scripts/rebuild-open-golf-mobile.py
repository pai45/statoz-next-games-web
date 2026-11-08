"""Rebuild the pinned Open Golf source without shared-memory threads."""
import concurrent.futures
import argparse
import io
from pathlib import Path
import shutil
import subprocess
import zipfile

BASE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=BASE / 'upstream')
parser.add_argument('--output', type=Path, default=BASE / 'mobile-build')
parser.add_argument('--sdk', type=Path, default=BASE / 'emsdk')
parser.add_argument('--link-only', action='store_true')
parser.add_argument('--inputs-only', action='store_true', help='Reuse existing objects except common/inputs.c')
parser.add_argument('--interface-only', action='store_true', help='Reuse existing objects except common/inputs.c and golf/ui.c')
args = parser.parse_args()
SOURCE, BUILD, SDK = args.source.resolve(), args.output.resolve(), args.sdk.resolve()
BUILD.mkdir(parents=True, exist_ok=True)
shutil.copytree(SOURCE / 'src', BUILD / 'src', dirs_exist_ok=True)

data_file = BUILD / 'src/common/data.c'
data = data_file.read_text()
data = data.replace('    golf_thread_create(_golf_data_thread_fn, NULL, "_golf_data_thread_fn");', '    /* Single-thread build: assets load and finalize on the render thread. */')
data = data.replace('''        golf_mutex_lock(&_file_events_lock);
        vec_push(&_file_events, _file_event(FILE_LOADED, file));
        golf_mutex_unlock(&_file_events_lock);''', '''        if (loader->finalize_fn) loader->finalize_fn(golf_data.ptr);
        /* Recursive dependencies may have grown the map; reacquire its entry. */
        map_get(&_loaded_data, file.path)->is_loaded = true;''')
start = data.index('    golf_mutex_lock(&_files_to_load_lock);', data.index('void golf_data_load('))
end = data.index('\n}', start)
data = data[:start] + '''    GOLF_UNUSED(load_async);
    _golf_data_thread_load_file(golf_file(path));''' + data[end:]
data_file.write_text(data)

# The upstream web build defaults to mouse mode even when Sokol delivers touch
# events. Select the input mode from actual events, preserving hybrid devices.
inputs_file = BUILD / 'src/common/inputs.c'
inputs = inputs_file.read_text()
inputs = inputs.replace('''    if (event->type == SAPP_EVENTTYPE_TOUCHES_BEGAN) {
''', '''    if (event->type == SAPP_EVENTTYPE_TOUCHES_BEGAN) {
        inputs.is_touch = true;
        memset(inputs.mouse_down, 0, sizeof(inputs.mouse_down));
        memset(inputs.mouse_clicked, 0, sizeof(inputs.mouse_clicked));
''')
inputs = inputs.replace('''    if (event->type == SAPP_EVENTTYPE_MOUSE_DOWN) {
''', '''    if (event->type == SAPP_EVENTTYPE_MOUSE_DOWN) {
        inputs.is_touch = false;
        inputs.touch_down = false;
        inputs.touch_began = false;
        inputs.touch_ended = false;
''')
inputs_file.write_text(inputs)

# StatOz shell: the bundle's HTML interface replaces the engine-drawn menus,
# HUD text, pause and result panels. Aiming visuals, the tutorial pointer,
# fades and the out-of-bounds flash stay in the engine. The bridge appended
# below exposes state and routes commands through the upstream transitions.
def replace_once(text, old, new, count=1):
    found = text.count(old)
    if found != count:
        raise SystemExit(f'ui.c patch expected {count} match(es), found {found}: {old[:60]!r}')
    return text.replace(old, new)

ui_file = BUILD / 'src/golf/ui.c'
ui = ui_file.read_text()
ui = replace_once(ui, 'static golf_t *golf; \n', '''static golf_t *golf; \n
/* StatOz: menus, HUD and result screens are drawn by the HTML shell. */
#define STATOZ_HTML_UI 1
static int statoz_tutorial_step = -1;
''')
ui = replace_once(ui, '    _golf_ui_gif_texture_name(layout, "loading_icon", dt);\n',
                  '    if (!STATOZ_HTML_UI) _golf_ui_gif_texture_name(layout, "loading_icon", dt);\n', 2)
ui = replace_once(ui, '    _golf_ui_texture_draw(black_texture, pos, size, bg_color, bg_color.w);\n',
                  '    statoz_tutorial_step = step;\n    if (!STATOZ_HTML_UI) _golf_ui_texture_draw(black_texture, pos, size, bg_color, bg_color.w);\n')
for name in ['text_1_pos, text_size, text_color, 0, 0, text_1', 'text_2_pos, text_size, text_color, 0, 0, text_2',
             'pos, text_size, text_color, 0, 0, text_3', 'text_1_pos, text_size, text_color, 0, 0, text_4',
             'text_2_pos, text_size, text_color, 0, 0, text_5']:
    ui = replace_once(ui, f'        _golf_ui_draw_text(font, {name}.cstr, 1);\n',
                      f'        if (!STATOZ_HTML_UI) _golf_ui_draw_text(font, {name}.cstr, 1);\n')
ui = replace_once(ui, '''    _golf_ui_text_name(layout, "main_text", 1);
    _golf_ui_text_name(layout, "main2_text", 1);
''', '''    if (!STATOZ_HTML_UI) {
    _golf_ui_text_name(layout, "main_text", 1);
    _golf_ui_text_name(layout, "main2_text", 1);
''')
ui = replace_once(ui, '''            _golf_ui_start_fade_out(false, true, clicked_button_num, false);
        }
    }
''', '''            _golf_ui_start_fade_out(false, true, clicked_button_num, false);
        }
    }
    }
''')
for menu in ['_golf_ui_in_game_paused', '_golf_ui_in_game_finished']:
    ui = replace_once(ui, f'static void {menu}(float dt) {{\n    GOLF_UNUSED(dt);\n',
                      f'static void {menu}(float dt) {{\n    GOLF_UNUSED(dt);\n    if (STATOZ_HTML_UI) return;\n')
ui = replace_once(ui, '        if (_golf_ui_button_name(layout, "pause_button")) {\n',
                  '        if (!STATOZ_HTML_UI && _golf_ui_button_name(layout, "pause_button")) {\n')
ui = replace_once(ui, '    if (golf->in_game.t < time_to_show_level_num + fade_in_length) {\n',
                  '    if (!STATOZ_HTML_UI && golf->in_game.t < time_to_show_level_num + fade_in_length) {\n')
ui = replace_once(ui, '    ui.draw_entities.length = 0;\n', '    ui.draw_entities.length = 0;\n    statoz_tutorial_step = -1;\n')
ui += (BASE / 'open-golf/statoz-ui-bridge.c').read_text()
ui_file.write_text(ui)

archive = io.BytesIO()
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as output:
    for file in sorted((SOURCE / 'data').rglob('*')):
        if file.is_file():
            info = zipfile.ZipInfo(file.relative_to(SOURCE / 'data').as_posix(), (2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            output.writestr(info, file.read_bytes())
payload = archive.getvalue()
with (BUILD / 'src/common/data_zip.h').open('w') as output:
    output.write('static const unsigned char golf_data_zip[] = {\n')
    for offset in range(0, len(payload), 32):
        output.write(','.join(str(value) for value in payload[offset:offset+32]) + ',\n')
    output.write('};\n')

compiler = SDK / 'upstream/emscripten/emcc.bat'
sources = list((BUILD / 'src/common').glob('*.c')) + list((BUILD / 'src/golf').glob('*.c'))
for library, names in {
    'cimgui': ['cimgui.cpp', 'imgui/imgui.cpp', 'imgui/imgui_draw.cpp', 'imgui/imgui_tables.cpp', 'imgui/imgui_widgets.cpp', 'imgui/imgui_demo.cpp'],
    'fast_obj': ['fast_obj.c'], 'mattiasgustavsson_libs': ['impl.c'],
    'parson': ['parson.c'], 'sokol': ['impl.c'],
    'stb': ['impl.c'], 'xatlas': ['xatlas.cpp'],
}.items():
    sources += [BUILD / 'src/3rd_party' / library / name for name in names]
flags = ['-O2', '-DNDEBUG', '-DSOKOL_GLES3', '-DGOLF_PLATFORM_EMSCRIPTEN',
         '-I' + str(BUILD / 'src'), '-I' + str(BUILD / 'src/3rd_party'),
         '-Wno-incompatible-function-pointer-types', '-Wno-int-conversion', '-Wno-implicit-function-declaration']

def compile_one(source):
    obj = BUILD / ('obj-' + source.relative_to(BUILD / 'src').as_posix().replace('/', '-') + '.o')
    interface = source in (BUILD / 'src/common/inputs.c', BUILD / 'src/golf/ui.c')
    if not args.link_only and (not args.inputs_only or source == BUILD / 'src/common/inputs.c') and (not args.interface_only or interface):
        subprocess.run([str(compiler), *flags, '-c', str(source), '-o', str(obj)], check=True)
    print('Compiled', source.name, flush=True)
    return obj

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    objects = list(pool.map(compile_one, sources))
subprocess.run([str(compiler), *map(str, objects), '-O2', '-g2', '-sUSE_WEBGL2=1', '-sFULL_ES3=1',
                '-sALLOW_MEMORY_GROWTH=1', '-sINITIAL_MEMORY=33554432', '-sMAXIMUM_MEMORY=268435456',
                '-sSTACK_SIZE=5242880',
                '-sFORCE_FILESYSTEM=1', '-sEXPORTED_RUNTIME_METHODS=FS,MEMFS', '-lidbfs.js', '-lstdc++',
                '-o', str(BUILD / 'golf.js')], check=True)
print('Built', BUILD / 'golf.js', flush=True)
