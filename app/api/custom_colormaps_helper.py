import math
from .common import hex2rgb

def discrete_cmap_from_hex(hex_colors):
    rgb_colors = [hex2rgb(h, with_alpha=True) for h in hex_colors]
    return {x: rgb_colors[math.floor(x / 256.0 * len(rgb_colors))] for x in range(0, 255)}


ndvi_arr = [
    '#AD0028',
    '#C5142A',
    '#E02D2C',
    '#EF4C3A',
    '#FE6C4A',
    '#FF8D5A',
    '#FFAB69',
    '#FFC67D',
    '#FFE093',
    '#FFEFAB',
    '#FDFEC2',
    '#EAF7AC',
    '#D5EF94',
    '#B9E383',
    '#9BD873',
    '#77CA6F',
    '#53BD6B',
    '#14AA60',
    '#009755',
    '#007E47'
]
contrast_ndvi_arr = [
    '#AD0028',
    '#FFAB69',
    '#FDFEC2',
    '#77CA6F',
    '#014729'
]

custom_colormaps = [
    {"discrete_ndvi": discrete_cmap_from_hex(contrast_ndvi_arr)},
    {"better_discrete_ndvi": discrete_cmap_from_hex(ndvi_arr)},
    #add custom maps here
]
