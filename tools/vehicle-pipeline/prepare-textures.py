import sys
from PIL import Image
src=sys.argv[1];im=Image.open(src+'/SedanYellow.png').convert('RGB');px=im.load()
for y in range(im.height):
 for x in range(im.width):
  r,g,b=px[x,y]
  if r>g*.88 and g>b*1.35 and g>15:
   lum=(r*.25+g*.65+b*.1)*.43;px[x,y]=(int(lum*.88),int(lum*.96),int(lum*1.05))
im.save(src+'/paint.png')
