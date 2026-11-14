"""Échantillons GGBotNet CC0. FFmpeg requis uniquement pour maintenir les assets."""
import sys,subprocess,array,math,os
src,out=sys.argv[1:];os.makedirs(out,exist_ok=True)
def samples(name):
 b=subprocess.check_output(['ffmpeg','-v','error','-i',src+'/'+name,'-ac','1','-ar','24000','-f','f32le','-'])
 a=array.array('f');a.frombytes(b);return a
def save(a,name):
 subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar','24000','-ac','1','-i','-','-c:a','libvorbis','-q:a','5',out+'/'+name],input=a.tobytes(),check=True)
def loop(a,n=4800):
 n=min(n,len(a)//4);b=a[n:]
 for i in range(n):
  t=(i/(n-1))*math.pi/2;c=math.cos(t)**2;s=math.sin(t)**2;b[len(b)-n+i]=a[len(a)-n+i]*c+a[i]*s
 peak=max(abs(x)for x in b)or 1
 return array.array('f',(x*.75/peak for x in b))
for name,target in [('Car_Engine_Loop.ogg','idle.ogg'),('Car_Engine_Loop_2.ogg','engine.ogg')]:save(loop(samples(name)),target)
for name,target in [('Car_Engine_Start_Up.ogg','start.ogg'),('Car_Engine_Turning_Off.ogg','stop.ogg')]:
 a=samples(name);n=min(240,len(a)//10)
 for i in range(n):a[i]*=i/n;a[-1-i]*=i/n
 save(a,target)
a=samples('Car_Horn.ogg');save(loop(a[int(.16*24000):int(.62*24000)],1200),'horn.ogg')
