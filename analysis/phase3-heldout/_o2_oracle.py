
import json, sys

def orient2d(ax, ay, bx, by, cx, cy):
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)

def has_proper_crossing(verts):
    n = len(verts)
    if n < 4:
        return False, False
    closed = (verts[0][0] == verts[-1][0] and verts[0][1] == verts[-1][1])
    seg_count = n - 1
    has_proper = False
    has_any_crossing = False
    for i in range(seg_count):
        ax, ay = verts[i]
        bx, by = verts[i+1]
        for j in range(i+1, seg_count):
            if abs(i-j) <= 1: continue
            if closed and i == 0 and j == seg_count - 1: continue
            cx, cy = verts[j]
            dx, dy = verts[j+1]
            o1 = orient2d(ax,ay,bx,by,cx,cy)
            o2 = orient2d(ax,ay,bx,by,dx,dy)
            o3 = orient2d(cx,cy,dx,dy,ax,ay)
            o4 = orient2d(cx,cy,dx,dy,bx,by)
            def sign(v): return 1 if v>0 else (-1 if v<0 else 0)
            s1,s2,s3,s4 = sign(o1),sign(o2),sign(o3),sign(o4)
            # Any crossing (general + collinear)
            gen = (s1!=s2 and s3!=s4) or                   (o1==0 and min(ax,bx)<=cx<=max(ax,bx) and min(ay,by)<=cy<=max(ay,by)) or                   (o2==0 and min(ax,bx)<=dx<=max(ax,bx) and min(ay,by)<=dy<=max(ay,by)) or                   (o3==0 and min(cx,dx)<=ax<=max(cx,dx) and min(cy,dy)<=ay<=max(cy,dy)) or                   (o4==0 and min(cx,dx)<=bx<=max(cx,dx) and min(cy,dy)<=by<=max(cy,dy))
            if gen:
                has_any_crossing = True
                # Proper = strictly opposite signs on both straddling tests
                if s1 != 0 and s2 != 0 and s1 != s2 and s3 != 0 and s4 != 0 and s3 != s4:
                    has_proper = True
    return has_any_crossing, has_proper

data = json.load(open(sys.argv[1]))
results = []
for ring in data['rings']:
    verts = [(v['x'],v['y']) for v in ring['vertices']]
    any_cross, proper = has_proper_crossing(verts)
    results.append({
        'id': ring['id'],
        'oracle2_self_intersects': any_cross,
        'oracle2_has_proper_crossing': proper,
    })
print(json.dumps({'results': results}))
