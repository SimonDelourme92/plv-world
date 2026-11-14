from pathlib import Path
import json,zipfile,hashlib,urllib.request,struct,re,sys
ROOT=Path(__file__).resolve().parents[2];LIB=ROOT/'assets/library';S=Path(sys.argv[1]).resolve();sha=lambda b:hashlib.sha256(b).hexdigest()
providers={
 'kenney-commercial':{'name':'Kenney — City Kit Commercial 2.1','author':'Kenney','url':'https://kenney.nl/assets/city-kit-commercial','license':'CC0-1.0','licenseFile':'assets/library/licenses/kenney-commercial.txt','archiveSha256':sha((S/'commercial.zip').read_bytes())},
 'kenney-space':{'name':'Kenney — Space Kit 2.0','author':'Kenney','url':'https://kenney.nl/assets/space-kit','license':'CC0-1.0','licenseFile':'assets/library/licenses/kenney-space.txt','archiveSha256':sha((S/'space.zip').read_bytes())},
 'kenney-prompts':{'name':'Kenney — Input Prompts 1.5A','author':'Kenney','url':'https://kenney.nl/assets/input-prompts','license':'CC0-1.0','licenseFile':'assets/library/licenses/kenney-prompts.txt','archiveSha256':sha((S/'prompts.zip').read_bytes())},
 'quaternius-scifi':{'name':'Quaternius — Modular Sci-Fi MegaKit Standard FREE','author':'Quaternius','url':'https://quaternius.com/packs/modularscifimegakit.html','license':'CC0-1.0','licenseFile':'assets/library/licenses/quaternius-scifi.txt'},
 'quaternius-downtown':{'name':'Quaternius — Downtown City MegaKit Standard FREE','author':'Quaternius','url':'https://quaternius.com/packs/downtowncitymegakit.html','license':'CC0-1.0','licenseFile':'assets/library/licenses/quaternius-downtown.txt'},
 'quaternius-nature':{'name':'Quaternius — Stylized Nature MegaKit Standard FREE','author':'Quaternius','url':'https://quaternius.com/packs/stylizednaturemegakit.html','license':'CC0-1.0','licenseFile':'assets/library/licenses/quaternius-nature.txt'},
 'polyhaven':{'name':'Poly Haven — Mountainside','author':', '.join(json.loads((S/'polyhaven-models.json').read_text())['mountainside'].get('authors',{})),'url':'https://polyhaven.com/a/mountainside','license':'CC0-1.0','licenseFile':'assets/library/licenses/polyhaven-cc0.txt'},
 'amvlab':{'name':'AMVLab Aircraft Models — variantes sans logos','author':'amvlab','url':'https://github.com/amvlab/aircraft-models','license':'CC-BY-4.0','licenseFile':'assets/library/licenses/amvlab-cc-by-4.0.txt','attribution':'Aircraft models by amvlab, CC BY 4.0. Recentrage, échelle de présentation, simplification, textures et compression adaptés pour PLV WORLD.'}}
for key,v in providers.items():
 v['licenseVerified']=True;v['licenseUrl']='https://creativecommons.org/licenses/by/4.0/' if key=='amvlab' else 'https://creativecommons.org/publicdomain/zero/1.0/'
 if key.startswith('kenney-'):
  pack={'kenney-commercial':'commercial','kenney-space':'space','kenney-prompts':'prompts'}[key];(ROOT/v['licenseFile']).write_bytes(zipfile.ZipFile(S/(pack+'.zip')).read('License.txt'))
 elif key.startswith('quaternius-'):
  slug={'quaternius-scifi':'modular-sci-fi-megakit','quaternius-downtown':'downtown-city-megakit','quaternius-nature':'stylized-nature-megakit'}[key];(ROOT/v['licenseFile']).write_bytes((S/slug/'LICENSE.txt').read_bytes());h=json.loads((S/(slug+'-headers.json')).read_text());v['archiveEtag']=h['etag'];v['archiveLastModified']=h['last-modified'];v['downloadMethod']='Extraction HTTP Range de la version Standard gratuite ; archive complète non téléchargée.'
 elif key=='amvlab':(ROOT/v['licenseFile']).write_bytes((S/'aircraft-LICENSE.txt').read_bytes())
 else:(ROOT/v['licenseFile']).write_text('Poly Haven — All assets are CC0.\nOfficial license: https://polyhaven.com/license\nAsset: https://polyhaven.com/a/mountainside\nCC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/\nMetadata and files verified from https://api.polyhaven.com/files/mountainside\n')
 sourceLicense=(ROOT/v['licenseFile']).read_bytes();v['licenseSourceSha256']=sha(sourceLicense);(ROOT/v['licenseFile']).write_text('\n'.join(line.rstrip() for line in sourceLicense.decode().splitlines()).strip()+'\n');v['licenseSha256']=sha((ROOT/v['licenseFile']).read_bytes())
models=json.loads((LIB/'models-manifest.tmp.json').read_text());q=json.loads((S/'quaternius-selection.json').read_text());mt=json.loads((S/'mountainside-files.json').read_text())['gltf']['1k']['gltf']
for a in models:
 a['license']=providers[a['provider']]['license'];a['licenseVerified']=True;a['licenseFile']=providers[a['provider']]['licenseFile'];a['sourceUrl']=providers[a['provider']]['url']
 if a['id']=='pavillon-astra':
  a['providers']=['quaternius-scifi','quaternius-downtown'];a['sourceComponents']=[{'provider':'quaternius-downtown' if 'downtown' in e['pack'] else 'quaternius-scifi','path':e['sourceFile'],'sha256':sha(Path(e['localPath']).read_bytes())} for e in q if 'nature' not in e['pack']]
 if a['provider']=='polyhaven':
  a['sourceChecksums']=[{'path':k,'md5':v['md5'],'verified':hashlib.md5((S/'mountainside'/k).read_bytes()).hexdigest()==v['md5']} for k,v in mt['include'].items()]
  if not all(x['verified'] for x in a['sourceChecksums']):raise ValueError('Hash source Poly Haven')
 if a['provider']=='amvlab':
  name=Path(a['sourceModel']).name;tree=json.loads((S/'aircraft-tree.json').read_text())['tree'];e=next(e for e in tree if e['path']=='models/'+name);data=(S/name).read_bytes();gitHash=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();assert gitHash==e['sha'];a['sourceGitBlob']=gitHash;a['attribution']=providers['amvlab']['attribution'];a['sourceUrl']='https://github.com/amvlab/aircraft-models/blob/main/models/'+name
 if a['provider']=='quaternius-nature':
  e=next(e for e in q if e['localPath']==str(S/a['sourceModel']));a['sourceArchiveMember']=e['sourceFile']
 a['runtimeLod']=1 if a['usage']=='horizon' else None
# Choix limité aux touches réellement utilisées. SVG officiels, inchangés.
z=zipfile.ZipFile(S/'prompts.zip');names=['keyboard_e','keyboard_c','keyboard_t','keyboard_v','keyboard_m','keyboard_o','keyboard_p','keyboard_r','keyboard_h','keyboard_f','keyboard_escape','keyboard_shift','keyboard_space','keyboard_ctrl','keyboard_w','keyboard_a','keyboard_s','keyboard_d','keyboard_z','keyboard_q','mouse_move','mouse_left','mouse_scroll']
icons=[]
for name in names:
 member='Keyboard & Mouse/Vector/'+name+'.svg'
 if member not in z.namelist():
  print('Icône non disponible',member);continue
 b=z.read(member)
 if re.search(rb'<script|<foreignObject|(?:href|src)=["\']https?://',b,re.I):raise ValueError('SVG externe actif')
 relative='assets/library/icons/'+name+'.svg';(ROOT/relative).write_bytes(b);text=b.decode();view=re.search(r'viewBox="([^"]+)"',text);dims=[float(v) for v in view.group(1).split()][2:] if view else [float(re.search(r'\bwidth="([0-9.]+)"',text).group(1)),float(re.search(r'\bheight="([0-9.]+)"',text).group(1))]
 icons.append({'id':name,'category':'commandes','path':relative,'bytes':len(b),'sha256':sha(b),'dimensionsPixels':dims,'provider':'kenney-prompts','sourceArchiveMember':member,'license':'CC0-1.0','licenseVerified':True,'licenseFile':providers['kenney-prompts']['licenseFile'],'lod':'vectoriel','usage':'aide-commandes'})
manifest={'format':'plv-asset-library','version':1,'legacyAudit':'docs/assets-herites-audit.json','licensePolicy':'Licences par asset : aucune licence globale imposée aux modèles tiers. PLV utilisateur exclues de cette bibliothèque.','palette':'blanc, anthracite, verre bleuté et accents cyan ; végétation naturelle','providers':providers,'models':models,'icons':icons,'totals':{'models':len(models),'modelVariants':sum(len(a['lods']) for a in models),'modelBytes':sum(x['bytes'] for a in models for x in a['lods']),'horizonBytes':sum(a['lods'][1]['bytes'] for a in models if a['usage']=='horizon'),'icons':len(icons),'iconBytes':sum(i['bytes'] for i in icons)}}
(LIB/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');(LIB/'models-manifest.tmp.json').unlink();print(json.dumps(manifest['totals']))
