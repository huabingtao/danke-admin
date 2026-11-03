import json,hashlib,requests,concurrent.futures,subprocess
from pathlib import Path
from io import BytesIO
from PIL import Image
root=Path('/home/guagua/workspace/project/danke-admin')
p=root/'docs/data-imports/2026-11-02-gem-values'; ref=json.loads((p/'reference.json').read_text()); items=json.loads((p/'items-before.json').read_text()); byname={i['name']:i for i in items}
# Explicit reference mapping; random/select, grade and semantics remain distinct.
known={0:['神器核心'],1:['特工核心','特工觉醒核心'],2:['谐振芯片'],3:['传奇收藏品','传奇收藏品宝箱'],4:['异宠核心'],5:['核心自选宝箱','自选核心'],6:['核心自选宝箱精华'],7:['神炼核心'],8:['s杰出装备'],13:['永恒之石'],14:['破坏之石'],15:['混沌之石'],16:['谐振芯片与传奇收藏品自选宝箱'],17:['谐振芯片自选宝箱'],18:['史诗配件','史诗配件自选宝箱'],20:['杰出配件','杰出配件自选宝箱'],25:['高级收藏之心'],27:['史诗收藏品','史诗收藏品宝箱'],30:['杰出收藏品','杰出收藏品自选宝箱'],31:['杰出收藏品宝箱'],32:['传奇收藏品解构机'],34:['s特工碎片'],35:['sp特工万能碎片'],37:['自选特工碎片'],39:['特工升级精油_经验'],40:['特工升级精油_经验'],42:['普通钥匙'],43:['s级军备钥匙'],44:['收藏品宝箱钥匙'],45:['配件宝箱钥匙'],46:['高级钥匙'],47:['宠物钥匙','普通宠物钥匙'],48:['高级宠物箱钥匙'],49:['异宠灵药'],50:['特工和异宠核心自选宝箱'],51:['觉醒水晶自选宝箱'],52:['异宠晶石'],53:['觉醒水晶'],54:['异世宠物自选宝箱'],55:['史诗宠物自选宝箱','史诗宠物宝箱'],57:['杰出宠物'],62:['宠物饼干'],70:['末世战马碎片'],71:['科技滑板碎片'],72:['电动平衡车碎片'],73:['载具零件钥匙','零件宝箱钥匙'],74:['洗炼精华'],75:['传奇载具碎片自选宝箱'],77:['矿洞挑战券']}
# Existing obsolete/ambiguous generic pet box cannot be assumed random or selectable.
pending={56:'现有史诗宠物名称未区分随机/自选，保留待核对，避免重复创建'}
groups={'Core Equivalents':['core'],'S Gear':['equipment'],'Tech':['tech'],'Collectibles':['collection'],'Survivor':['agent'],'Keys':['key'],'Pets':['pet'],'Mounts':['vehicle'],'Tickets':['general'],'Event Currencies':['event']}
coreSystems={0:['core','equipment'],1:['core','agent'],2:['core','tech'],3:['collection'],4:['core','pet'],5:['core'],6:['core'],7:['core','equipment'],16:['core','tech','collection'],17:['core','tech'],33:['core','agent'],50:['core','agent','pet']}
keySystems={42:['key','equipment'],43:['key','equipment'],44:['key','collection'],45:['key','tech'],46:['key','equipment'],47:['key','pet'],48:['key','pet'],73:['key','vehicle']}
# Import URLs are same-site paths from the captured reference. Validate every raster before publishing.
assert hashlib.sha256(json.dumps(ref,sort_keys=True,ensure_ascii=False).encode()).hexdigest() == 'd91112c3782795016a3eac57f71e4b96e6aaf295c3ebaffe27d27d4979684dae', 'Reference snapshot changed; review index mapping before importing'
core=Path('/home/guagua/workspace/project/danke-core'); dest=core/'public/uploads/item-icons/reference-gems';dest.mkdir(parents=True,exist_ok=True)
urls={r['iconSource']:r['imageProxy'] for r in ref['entries']}
def fetch(pair):
 url,proxy=pair; data=None; err=None
 for target in [url,proxy]:
  try:
   resp=requests.get(target,timeout=25);resp.raise_for_status(); im=Image.open(BytesIO(resp.content));im.load();assert im.width>0 and im.height>0
   out=BytesIO();im.convert('RGBA').save(out,format='PNG');data=out.getvalue();break
  except Exception as e:err=str(e)
 if data is None:return url,{'error':err}
 digest=hashlib.sha256(data).hexdigest();name=digest[:24]+'.png';target=dest/name
 if target.exists():assert target.read_bytes()==data
 else:target.write_bytes(data)
 return url,{'path':'/uploads/item-icons/reference-gems/'+name,'sha256':digest,'width':im.width,'height':im.height}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: assets=dict(pool.map(fetch,urls.items()))
entries=[]
for idx,row in enumerate(ref['entries']):
 names=[n for n in known.get(idx,[]) if n in byname]
 categoryIds=coreSystems.get(idx,keySystems.get(idx,groups[row['group']]))
 itemIds=[byname[n]['id'] for n in names]
 name=row['referenceName']+(' · '+row['eventName'] if row['eventName'] else '')
 scheme=row['referenceKey'] if idx in [39,40] else 'default'
 label={'Oil (Pre-Synergy)':'协同前','Oil (Post-Synergy)':'协同后'}.get(row['referenceName'],'默认单价')
 row={**row,'existingItemIds':itemIds,'existingNames':names,'name':name,'categoryIds':categoryIds,'schemeId':scheme,'schemeLabel':label,'translationPending':not bool(itemIds),'asset':assets[row['iconSource']],'evidence':'参考站名称、用途及现有已核实中文别名；不同品质/随机/自选不混并' if itemIds else '参考站独立条目，保留英文名及活动名以便核对'}
 if idx in pending:row['pendingReason']=pending[idx]
 if 'error' in row['asset']:row['pendingReason']='图片未取得: '+row['asset']['error']
 entries.append(row)
manifest={**{k:v for k,v in ref.items() if k!='entries'},'entries':entries,'assetCount':len(assets)}
(p/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'entries':len(entries),'matched':sum(bool(e['existingItemIds']) for e in entries),'new':sum(not e['existingItemIds'] and not e.get('pendingReason') for e in entries),'pending':[(e['referenceName'],e.get('pendingReason')) for e in entries if e.get('pendingReason')],'assets':len(assets)},ensure_ascii=False))
