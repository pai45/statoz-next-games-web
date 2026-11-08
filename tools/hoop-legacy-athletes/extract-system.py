"""Extract only the original plan's CC0 skin/eye/card inputs into this repo cache."""
from pathlib import Path
import zipfile,hashlib
root=Path(__file__).resolve().parents[2]
cache=root/'.cache/hoop-legacy-athletes'
archive=cache/'system-assets.zip'
assert hashlib.sha256(archive.read_bytes()).hexdigest()=='b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107'
destination=cache/'mhsys'
prefixes=('skins/young_african_male/','skins/young_asian_male/','skins/young_caucasian_male/','eyebrows/','eyelashes/','teeth/teeth_base/','eyes/materials/','hair/afro01/','hair/short02/','packs/')
with zipfile.ZipFile(archive) as source:
    selected=[name for name in source.namelist() if name.startswith(prefixes) and not name.endswith('/')]
    for name in selected:
        target=(destination/name).resolve()
        assert target.is_relative_to(destination.resolve()),'Archive path escapes cache'
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(source.read(name))
print('Extracted',len(selected),'CC0 data files from the verified system archive')
