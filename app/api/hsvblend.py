import numpy as np

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
# rgb_to_hsv()
#
# rgb comes in as [r,g,b] with values in the range [0,255].  The returned
# hsv values will be with hue and saturation in the range [0,1] and value
# in the range [0,255]
#
def rgb_to_hsv( r,g,b ):

    maxc = np.maximum(r,np.maximum(g,b))
    minc = np.minimum(r,np.minimum(g,b))

    v = maxc

    minc_eq_maxc = np.equal(minc,maxc)

    # compute the difference, but reset zeros to ones to avoid divide by zeros later.
    ones = np.ones((r.shape[0],r.shape[1]))
    maxc_minus_minc = np.choose( minc_eq_maxc, (maxc-minc,ones) )

    s = (maxc-minc) / np.maximum(ones,maxc)
    rc = (maxc-r) / maxc_minus_minc
    gc = (maxc-g) / maxc_minus_minc
    bc = (maxc-b) / maxc_minus_minc

    maxc_is_r = np.equal(maxc,r)
    maxc_is_g = np.equal(maxc,g)
    maxc_is_b = np.equal(maxc,b)

    h = np.zeros((r.shape[0],r.shape[1]))
    h = np.choose( maxc_is_b, (h,4.0+gc-rc) )
    h = np.choose( maxc_is_g, (h,2.0+rc-bc) )
    h = np.choose( maxc_is_r, (h,bc-gc) )

    h = np.mod(h/6.0,1.0)

    hsv = np.asarray([h,s,v])

    return hsv

# =============================================================================
# hsv_to_rgb()
#
# hsv comes in as [h,s,v] with hue and saturation in the range [0,1],
# but value in the range [0,255].

def hsv_to_rgb( hsv ):

    h = hsv[0]
    s = hsv[1]
    v = hsv[2]

    #if s == 0.0: return v, v, v
    i = (h*6.0).astype(int)
    f = (h*6.0) - i
    p = v*(1.0 - s)
    q = v*(1.0 - s*f)
    t = v*(1.0 - s*(1.0-f))

    r = i.choose( v, q, p, p, t, v )
    g = i.choose( t, v, v, q, p, p )
    b = i.choose( p, p, t, v, v, q )

    rgb = np.asarray([r,g,b]).astype(np.uint8)

    return rgb


def hsv_blend(rgb, intensity):
    hsv = rgb_to_hsv(rgb[0], rgb[1], rgb[2])

    #replace v with hillshade
    hsv_adjusted = np.asarray( [hsv[0], hsv[1], intensity] )

    #convert back to RGB
    return hsv_to_rgb( hsv_adjusted )