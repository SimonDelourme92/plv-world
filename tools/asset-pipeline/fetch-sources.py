"""Préparation développeur : versions gratuites et extractions ciblées, sans compte utilisateur.
Usage : python3 fetch-sources.py /tmp/plv-sources
Le jeu et le catalogue ne nécessitent aucune installation.
"""
from pathlib import Path
import sys, urllib.request, urllib.error, urllib.parse, http.cookiejar, json, re, zipfile, io, posixpath
DEST=Path(sys.argv[1]).resolve();DEST.mkdir(parents=True,exist_ok=True)
UA='PLVWorldAssetAudit/1.0 (+https://github.com/SimonDelourme92/plv-world)'
def read(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=40) as r:
  data=r.read(45*1024*1024+1)
  if len(data)>45*1024*1024:raise ValueError('Téléchargement trop volumineux : '+url)
  return data
def opener():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def csrf(text):return re.search('name="csrf_token" value="([^"]+)"',text).group(1)
class PartialZip(io.RawIOBase):
 def __init__(self,slug):
  self.slug=slug;self.pos=0;self.bytes=0;self.refresh()
  with urllib.request.urlopen(urllib.request.Request(self.url,headers={'Range':'bytes=-65536'}),timeout=40) as r:
   if r.status!=206:raise ValueError('Téléchargement partiel indisponible : '+slug)
   self.size=int(r.headers['Content-Range'].split('/')[-1]);headers={k.lower():v for k,v in r.headers.items()};r.read(65537);self.bytes+=65536
  (DEST/(slug+'-headers.json')).write_text(json.dumps(headers))
 def refresh(self):
  op=opener();base='https://quaternius.itch.io/'+self.slug;s=op.open(base,timeout=30).read().decode();d=json.load(op.open(urllib.request.Request(base+'/download_url',data=urllib.parse.urlencode({'csrf_token':csrf(s)}).encode(),headers={'Referer':base}),timeout=30));s=op.open(d['url'],timeout=30).read().decode();uid=re.search('data-upload_id="([0-9]+)"',s).group(1)
  # La page gratuite ne propose que le téléchargement Standard autorisé.
  if '[Standard].zip' not in s:raise ValueError('Version Standard gratuite non identifiée')
  result=json.load(op.open(urllib.request.Request(base+'/file/'+uid,data=urllib.parse.urlencode({'csrf_token':csrf(s)}).encode(),headers={'Referer':d['url']}),timeout=30));self.url=result['url']
 def seekable(self):return True
 def readable(self):return True
 def tell(self):return self.pos
 def seek(self,n,whence=0):self.pos=n if whence==0 else self.pos+n if whence==1 else self.size+n;return self.pos
 def read(self,n=-1):
  if n<0:n=self.size-self.pos
  n=min(n,self.size-self.pos)
  if n<=0:return b''
  if n>16*1024*1024:raise ValueError('Plage refusée : taille excessive')
  start=self.pos
  for attempt in range(2):
   try:
    with urllib.request.urlopen(urllib.request.Request(self.url,headers={'Range':f'bytes={start}-{start+n-1}'}),timeout=40) as r:
     b=r.read(n+1)
     if r.status!=206 or not r.headers.get('Content-Range','').startswith(f'bytes {start}-') or len(b)!=n:raise ValueError('Plage ZIP invalide')
    self.pos+=n;self.bytes+=n;return b
   except urllib.error.HTTPError as error:
    if error.code!=403 or attempt:raise
    self.refresh() # lien signé expiré : nouveau lien via le parcours gratuit normal.
for pack,slug in [('commercial','city-kit-commercial'),('space','space-kit'),('prompts','input-prompts')]:
 op=opener();page='https://kenney.nl/assets/'+slug;s=op.open(page,timeout=30).read().decode();sid=re.search("data-download-id='([^']+)'",s).group(1);d=json.load(op.open(urllib.request.Request('https://kenney.nl/download-link/'+sid,headers={'Referer':page}),timeout=30));data=op.open(urllib.request.Request(d['url'],headers={'Referer':page}),timeout=40).read(45*1024*1024+1)
 if len(data)>45*1024*1024:raise ValueError('Archive Kenney trop grande')
 (DEST/(pack+'.zip')).write_bytes(data)
 if pack=='prompts':continue
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  folder=DEST/'kenney-selected'/pack;folder.mkdir(parents=True,exist_ok=True);(folder/'LICENSE.txt').write_bytes(z.read('License.txt'))
  names=['building-skyscraper-a','building-skyscraper-c','building-skyscraper-e'] if pack=='commercial' else ['craft_cargoA','hangar_roundGlass']
  import struct
  for name in names:
   member=next(e for e in z.namelist() if e.endswith('/'+name+'.glb'));b=z.read(member);(folder/(name+'.glb')).write_bytes(b);g=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
   for image in g.get('images',[]):
    uri=image.get('uri','')
    if not uri or uri.startswith('data:'):continue
    p=(folder/uri).resolve()
    if not p.is_relative_to(folder.resolve()):raise ValueError('Chemin de dépendance invalide')
    p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(posixpath.normpath(posixpath.join(posixpath.dirname(member),uri))))
selections={'modular-sci-fi-megakit':['Walls/WallAstra_Straight_Window.gltf','Walls/WallAstra_Corner_Square_Outer.gltf','Columns/Column_Astra.gltf','Platforms/Platform_3Plates.gltf','Platforms/Door_Frame_SquareTall.gltf'],'downtown-city-megakit':['Metal_FullWindow.gltf','Metal_Column_Center.gltf'],'stylized-nature-megakit':['CommonTree_3.gltf','Pine_2.gltf','Bush_Common.gltf']}
selected=[]
for slug,names in selections.items():
 reader=PartialZip(slug);folder=DEST/slug;folder.mkdir(exist_ok=True)
 with zipfile.ZipFile(reader) as z:
  files=z.namelist();lic=next(e for e in files if e.endswith('License_Standard.txt'));(folder/'LICENSE.txt').write_bytes(z.read(lic))
  for suffix in names:
   candidates=[e for e in files if e.endswith(suffix) and ('/glTF/' in '/'+e or '/glTF (' in e)];
   if len(candidates)!=1:raise ValueError('Sélection ambiguë : '+suffix)
   member=candidates[0];p=folder/member;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(member));g=json.loads(p.read_text());deps=[]
   for obj in g.get('buffers',[])+g.get('images',[]):
    uri=obj.get('uri','')
    if not uri or uri.startswith('data:'):continue
    dep=posixpath.normpath(posixpath.join(posixpath.dirname(member),urllib.parse.unquote(uri)));target=(folder/dep).resolve()
    if not target.is_relative_to(folder.resolve()):raise ValueError('Dépendance hors du dossier')
    if not target.exists():
     actual=dep if dep in files else sorted([e for e in files if posixpath.basename(e)==posixpath.basename(dep)],key=lambda e:('glTF' not in e,len(e)))[0];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(actual))
    deps.append(dep)
   selected.append({'pack':slug,'sourceFile':member,'localPath':str(p),'dependencies':deps})
 print(slug,reader.bytes,'octets transférés')
(DEST/'quaternius-selection.json').write_text(json.dumps(selected,indent=2))
base='https://api.polyhaven.com';info=json.loads(read(base+'/info/mountainside'));(DEST/'polyhaven-models.json').write_text(json.dumps({'mountainside':info}));data=json.loads(read(base+'/files/mountainside'));(DEST/'mountainside-files.json').write_text(json.dumps(data));g=data['gltf']['1k']['gltf'];folder=DEST/'mountainside';folder.mkdir(exist_ok=True);(folder/'mountainside.gltf').write_bytes(read(g['url']))
for name,v in g['include'].items():p=folder/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(read(v['url']))
api='https://api.github.com/repos/amvlab/aircraft-models';commit=json.loads(read(api+'/commits/main'))['sha'];tree=json.loads(read(api+'/git/trees/'+commit+'?recursive=1'));(DEST/'aircraft-tree.json').write_text(json.dumps(tree));(DEST/'aircraft-source.json').write_text(json.dumps({'commit':commit}));raw='https://raw.githubusercontent.com/amvlab/aircraft-models/'+commit+'/'
(DEST/'aircraft-LICENSE.txt').write_bytes(read(raw+'LICENSE'))
for name in ['A320_nologo','EVTOL_nologo','drone_nologo']:(DEST/(name+'.glb')).write_bytes(read(raw+'models/'+name+'.glb'))
print('Sources sélectionnées prêtes. Aucune version payante téléchargée.')
