"""Package identical ST/TT extension files; Python standard library only."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent
files = ('attachment.js', 'direct.js', 'index.js', 'LICENSE', 'manifest.json',
         'README.md', 'runtime.js', 'transport.js', 'UPSTREAM.md')
version = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))['version']
assert version == '0.1.0', 'Review release filenames and documentation when bumping the version'
dest = root / 'dist'
dest.mkdir(exist_ok=True)
checksums = []
for suffix, prefix in [('ST', 'local-build-tavern'),
                       ('TT-import', 'extensions/third-party/local-build-tavern')]:
    path = dest / f'Local-Build-Tavern-{version}-{suffix}.zip'
    with ZipFile(path, 'w', ZIP_DEFLATED) as archive:
        for name in files:
            archive.write(root / name, f'{prefix}/{name}')
    with ZipFile(path) as archive:
        assert set(archive.namelist()) == {f'{prefix}/{n}' for n in files}
        assert all(archive.read(f'{prefix}/{n}') == (root/n).read_bytes() for n in files)
    checksums.append(f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}')
    print(f'{path.name}: {len(files)} files, {path.stat().st_size} bytes')
(dest / 'SHA256SUMS.txt').write_text('\n'.join(checksums)+'\n', encoding='utf-8')
