"""One-time preparation: copy verified Web item PNGs, never overwrite differing assets.
Run from Admin: python3 scripts/prepare-web-item-icons.py
Produces a catalog and private provenance report; never writes a business database.
"""
import hashlib
import json
from pathlib import Path

ADMIN = Path(__file__).resolve().parents[1]
WEB = ADMIN.parent / 'danke-web' / 'public' / 'wiki-assets'
CORE = ADMIN.parent / 'danke-core' / 'public' / 'uploads' / 'item-icons'
LOCAL = ADMIN / 'public' / 'icons' / 'web-items'
SKIP = {'UICommon_PECell_Icon', 'HeroReset', 'exchange_btn', '末世战马头像', 's级杰出装备宝箱', 's级杰出装备自选宝箱'}
ALIASES = {
    '宠物钥匙': ('钥匙', '普通宠物钥匙'),
    '载具零件钥匙': ('钥匙', '零件宝箱钥匙'),
    '特工核心': ('道具', '特工觉醒核心'),
    '自选核心': ('宝箱', '核心自选宝箱'),
    's杰出装备': ('宝箱', 's级杰出装备自选宝箱'),
    '史诗配件': ('宝箱', '史诗配件自选宝箱'),
    '杰出配件': ('宝箱', '杰出配件自选宝箱'),
    '史诗宠物': ('宝箱', '史诗宠物宝箱'),
    '杰出宠物': ('宝箱', '杰出宠物宝箱'),
    '史诗收藏品': ('宝箱', '史诗收藏品宝箱'),
    '杰出收藏品': ('宝箱', '杰出收藏品宝箱'),
    '传奇收藏品': ('宝箱', '传奇收藏品宝箱'),
}

def main():
    sources = {}
    for category in ['道具', '钥匙', '碎片', '宝箱', '图纸', '活动道具']:
        for source in sorted((WEB / category).rglob('*.png')):
            if source.stem not in SKIP:
                if source.stem in sources and sources[source.stem].read_bytes() != source.read_bytes():
                    raise ValueError(f'Conflicting name: {source.stem}')
                sources[source.stem] = source
    for name, (category, original) in ALIASES.items():
        sources[name] = WEB / category / f'{original}.png'
    CORE.mkdir(parents=True, exist_ok=True)
    LOCAL.mkdir(parents=True, exist_ok=True)
    catalog, provenance = [], []
    for name, source in sorted(sources.items()):
        data = source.read_bytes()
        if not data.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValueError(f'Invalid PNG: {source}')
        digest = hashlib.sha256(data).hexdigest()
        filename = digest[:24] + '.png'
        for root in [CORE, LOCAL]:
            target = root / filename
            if target.exists() and target.read_bytes() != data:
                raise ValueError(f'Refusing overwrite: {target}')
            if not target.exists():
                target.write_bytes(data)
        icon = f'/uploads/item-icons/{filename}'
        catalog.append({'name': name, 'icon': icon, 'preview': f'/icons/web-items/{filename}'})
        provenance.append({'name': name, 'source': str(source), 'icon': icon, 'sha256': digest})
    (ADMIN / 'lib' / 'web-item-catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    report = ADMIN / 'docs' / 'web-item-icon-provenance.json'
    report.write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(catalog)} named items; {len(set(x["sha256"] for x in provenance))} unique PNGs copied to Core + Admin')

if __name__ == '__main__':
    main()
