import sys, zlib, re, os

def extract(path):
    data = open(path, 'rb').read()
    out = []
    # find all stream objects
    for m in re.finditer(rb'stream\r?\n', data):
        start = m.end()
        end = data.find(b'endstream', start)
        if end < 0:
            continue
        raw = data[start:end]
        raw = raw.rstrip(b'\r\n')
        try:
            dec = zlib.decompress(raw)
        except Exception:
            continue
        if b'Tj' not in dec and b'TJ' not in dec:
            continue
        txt = decode_stream(dec)
        if txt.strip():
            out.append(txt)
    return '\n'.join(out)

def decode_stream(dec):
    res = []
    # strings inside ( ) followed by Tj  OR inside [ ] ... TJ
    i = 0
    n = len(dec)
    while True:
        j = dec.find(b'Tj', i)
        k = dec.find(b'TJ', i)
        cands = [x for x in (j, k) if x >= 0]
        if not cands:
            break
        pos = min(cands)
        kind = dec[pos:pos+2]
        # walk back to matching '(' or '['
        p = pos - 1
        while p >= 0 and dec[p:p+1] in b' \r\n\t':
            p -= 1
        if dec[p:p+1] == b')':
            depth = 0
            q = p
            while q >= 0:
                if dec[q:q+1] == b')':
                    depth += 1
                elif dec[q:q+1] == b'(':
                    depth -= 1
                    if depth == 0:
                        break
                q -= 1
            s = dec[q+1:p]
            res.append(unescape(s))
        elif dec[p:p+1] == b']':
            q = dec.rfind(b'[', 0, p)
            if q >= 0:
                seg = dec[q+1:p]
                for sm in re.finditer(rb'\((?:\\.|[^\\()])*\)', seg):
                    res.append(unescape(sm.group(0)[1:-1]))
        i = pos + 2
    return ' '.join(res)

def unescape(s):
    out = bytearray()
    i = 0
    while i < len(s):
        c = s[i:i+1]
        if c == b'\\':
            nxt = s[i+1:i+2]
            if nxt in (b'n', b'r', b't', b'b', b'f'):
                out += {b'n': b'\n', b'r': b'\r', b't': b'\t', b'b': b'', b'f': b''}[nxt]
                i += 2
            elif nxt.isdigit():
                m = re.match(rb'[0-7]{1,3}', s[i+1:i+4])
                out.append(int(m.group(0), 8) & 0xFF)
                i += 1 + len(m.group(0))
            else:
                out += nxt
                i += 2
        else:
            out += c
            i += 1
    try:
        return out.decode('utf-8')
    except Exception:
        return out.decode('latin-1')

if __name__ == '__main__':
    for p in sys.argv[1:]:
        t = extract(p)
        outp = os.path.splitext(p)[0] + '.txt'
        with open(outp, 'w', encoding='utf-8') as f:
            f.write(t)
        print('WROTE', outp, len(t))
