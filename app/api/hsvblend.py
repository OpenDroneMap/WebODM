import numpy as np

# Originally based on work by Frank and Even
# Modified by Piero Toffanin for speed and lower memory usage
# The code here is re-licensed under AGPLv3, but is based on MIT

#******************************************************************************
#  Copyright (c) 2009, Frank Warmerdam
#  Copyright (c) 2010, Even Rouault <even dot rouault at mines-paris dot org>
#
#  Permission is hereby granted, free of charge, to any person obtaining a
#  copy of this software and associated documentation files (the "Software"),
#  to deal in the Software without restriction, including without limitation
#  the rights to use, copy, modify, merge, publish, distribute, sublicense,
#  and/or sell copies of the Software, and to permit persons to whom the
#  Software is furnished to do so, subject to the following conditions:
#
#  The above copyright notice and this permission notice shall be included
#  in all copies or substantial portions of the Software.
#
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
#  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
#  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
#  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
#  DEALINGS IN THE SOFTWARE.
#******************************************************************************


# =============================================================================
# rgb_to_hs()
#
# rgb comes in as [r,g,b] with values in the range [0,255].  The returned
# hsv values will be with hue and saturation in the range [0,1]
#

def rgb_to_hs( r, g, b ):
    
    maxc = np.maximum(r,np.maximum(g,b))
    minc = np.minimum(r,np.minimum(g,b))

    # compute the difference, but reset zeros to ones to avoid divide by zeros later.
    maxc_minus_minc = maxc-minc
    s = np.divide(maxc_minus_minc, np.maximum(maxc, 1), dtype=np.float32)
    maxc_minus_minc[minc==maxc] = 1

    rc = np.divide((maxc-r), maxc_minus_minc, dtype=np.float32)
    gc = np.divide((maxc-g), maxc_minus_minc, dtype=np.float32)
    bc = np.divide((maxc-b), maxc_minus_minc, dtype=np.float32)
    maxc_minus_minc = None

    h = np.zeros((r.shape[0],r.shape[1]), dtype=np.float32)
    np.copyto(h, 4.0+gc-rc, where=(maxc == b))
    np.copyto(h, 2.0+rc-bc, where=(maxc==g))
    rc = None
    np.copyto(h, bc-gc, where=(maxc==r))
    
    np.divide(h, 6.0, out=h)
    np.mod(h, 1.0, out=h)

    return h, s

# =============================================================================
# hsv_to_rgb()
#
# hsv comes in as [h,s,v] with hue and saturation in the range [0,1],
# but value in the range [0,255].

def hsv_to_rgb( h, s, v ):

    np.multiply(h, 6.0, out=h)
    i = h.astype(np.uint8)
    np.subtract(h, i, out=h)
    q = v*(1.0 - s*h)
    t = v*(1.0 - s*(1.0-h))
    h = None

    p = v*(1.0 - s)

    r = np.zeros_like(v, dtype=np.uint8)
    g = np.zeros_like(v, dtype=np.uint8)
    b = np.zeros_like(v, dtype=np.uint8)
    
    idx = i==0
    np.copyto(r, v, where=idx, casting='unsafe')
    np.copyto(g, t, where=idx, casting='unsafe')
    np.copyto(b, p, where=idx, casting='unsafe')
    
    idx = i==1
    np.copyto(r, q, where=idx, casting='unsafe')
    np.copyto(g, v, where=idx, casting='unsafe')
    np.copyto(b, p, where=idx, casting='unsafe')
    
    idx = i==2
    np.copyto(r, p, where=idx, casting='unsafe')
    np.copyto(g, v, where=idx, casting='unsafe')
    np.copyto(b, t, where=idx, casting='unsafe')

    idx = i==3
    np.copyto(r, p, where=idx, casting='unsafe')
    np.copyto(g, q, where=idx, casting='unsafe')
    np.copyto(b, v, where=idx, casting='unsafe')

    idx = i==4
    np.copyto(r, t, where=idx, casting='unsafe')
    np.copyto(g, p, where=idx, casting='unsafe')
    np.copyto(b, v, where=idx, casting='unsafe')

    idx = i==5
    np.copyto(r, v, where=idx, casting='unsafe')
    np.copyto(g, p, where=idx, casting='unsafe')
    np.copyto(b, q, where=idx, casting='unsafe')

    return np.asarray([r,g,b])


def hsv_blend(rgb, intensity):
    h, s = rgb_to_hs(rgb[0], rgb[1], rgb[2])

    #replace v with hillshade
    #convert back to RGB
    return hsv_to_rgb(h, s, intensity)