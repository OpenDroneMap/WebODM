# Algos from https://github.com/dirceup/tiled-vegetation-indices/blob/master/app/lib/vegetation_index.rb
import re
from functools import lru_cache


# Functions can use all of the supported functions and operators from
# https://numexpr.readthedocs.io/en/latest/user_guide.html#supported-operators
algos = {
    'VARI': {
        'bands': 'RGB',
        'expr': '(G - R) / (G + R - B)',
        'help': 'Visual Atmospheric Resistance Index shows the areas of vegetation.'
    },
    'NDVI': {
        'bands': 'RGN',
        'expr': '(N - R) / (N + R)',
        'help': 'Normalized Difference Vegetation Index shows the amount of green vegetation.'
    },
    'BAI': {
        'bands': 'RGN',
        'expr': '1.0 / (((0.1 - R) ** 2) + ((0.06 - N) ** 2))',
        'help': 'Burn Area Index hightlights burned land in the red to near-infrared spectrum.'
    },
    'GLI': {
        'bands': 'RGB',
        'expr': '((G * 2) - R - B) / ((G * 2) + R + B)',
        'help': 'Green Leaf Index shows greens leaves and stems.'
    },
    'GNDVI':{
        'bands': 'RGN',
        'expr': '(N - G) / (N + G)',
        'help': 'Green Normalized Difference Vegetation Index is similar to NDVI, but measures the green spectrum instead of red.'
    },

    '_TESTRB': {
        'bands': 'RGB',
        'expr': 'B+R'
    }
}

#@lru_cache(max_size=20)
def lookup_formula(algo, band_order = 'RGB'):
    if algo is None:
        return None
    if band_order is None:
        band_order = 'RGB'

    if algo not in algos:
        raise ValueError("Cannot find algorithm " + algo)
    if not band_order in band_map:
        raise ValueError("Cannot find band order " + band_order)

    input_bands = band_map[band_order]
    algo_bands = re.findall("[A-Z]+?[a-z]*", algos[algo]['bands'])

    def repl(matches):
        b = matches.group(1)
        return 'b' + str(input_bands.index(algo_bands.index(b)) + 1)

    return re.sub("([A-Z]+?[a-z]*)", repl, re.sub("\s+", "", algos[algo]['expr']))
