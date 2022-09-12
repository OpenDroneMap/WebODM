# Algos from https://github.com/dirceup/tiled-vegetation-indices/blob/master/app/lib/vegetation_index.rb
# Functions can use all of the supported functions and operators from
# https://numexpr.readthedocs.io/en/latest/user_guide.html#supported-operators

import re
from functools import lru_cache
from django.utils.translation import gettext_lazy as _

algos = {
    'NDVI': {
        'expr': '(N - R) / (N + R)',
        'help': _('Normalized Difference Vegetation Index shows the amount of green vegetation.')
    },
    'NDYI': {
        'expr': '(G - B) / (G + B)',
        'help': _('Normalized difference yellowness index (NDYI), best model variability in relative yield potential in Canola.')
    },
    'NDRE': {
        'expr': '(N - Re) / (N + Re)',
        'help': _('Normalized Difference Red Edge Index shows the amount of green vegetation of permanent or later stage crops.')
    },
    'NDWI': {
        'expr': '(G - N) / (G + N)',
        'help': _('Normalized Difference Water Index shows the amount of water content in water bodies.')
    },
    'NDVI (Blue)': {
        'expr': '(N - B) / (N + B)',
        'help': _('Normalized Difference Vegetation Index shows the amount of green vegetation.')
    },
    'ENDVI':{
        'expr': '((N + G) - (2 * B)) / ((N + G) + (2 * B))',
        'help': _('Enhanced Normalized Difference Vegetation Index is like NDVI, but uses Blue and Green bands instead of only Red to isolate plant health.')
    },
    'vNDVI':{
        'expr': '0.5268*((R ** -0.1294) * (G ** 0.3389) * (B ** -0.3118))',
        'help': _('Visible NDVI is an un-normalized index for RGB sensors using constants derived from citrus, grape, and sugarcane crop data.')
    },    
    'VARI': {
        'expr': '(G - R) / (G + R - B)',
        'help': _('Visual Atmospheric Resistance Index shows the areas of vegetation.'),
        'range': (-1, 1)
    },
    'EXG': {
        'expr': '(2 * G) - (R + B)',
        'help': _('Excess Green Index (derived from only the RGB bands) emphasizes the greenness of leafy crops such as potatoes.')
    },
    'TGI': {
        'expr': '(G - 0.39) * (R - 0.61) * B',
        'help': _('Triangular Greenness Index (derived from only the RGB bands) performs similarly to EXG but with improvements over certain environments.')
    },
    'BAI': {
        'expr': '1.0 / (((0.1 - R) ** 2) + ((0.06 - N) ** 2))',
        'help': _('Burn Area Index hightlights burned land in the red to near-infrared spectrum.')
    },
    'GLI': {
        'expr': '((G * 2) - R - B) / ((G * 2) + R + B)',
        'help': _('Green Leaf Index shows greens leaves and stems.'),
        'range': (-1, 1)
    },
    'GNDVI':{
        'expr': '(N - G) / (N + G)',
        'help': _('Green Normalized Difference Vegetation Index is similar to NDVI, but measures the green spectrum instead of red.')
    },
    'GRVI':{
        'expr': 'N / G',
        'help': _('Green Ratio Vegetation Index is sensitive to photosynthetic rates in forests.')
    },
    'SAVI':{
        'expr': '(1.5 * (N - R)) / (N + R + 0.5)',
        'help': _('Soil Adjusted Vegetation Index is similar to NDVI but attempts to remove the effects of soil areas using an adjustment factor (0.5).')
    },
    'MNLI':{
        'expr': '((N ** 2 - R) * 1.5) / (N ** 2 + R + 0.5)',
        'help': _('Modified Non-Linear Index improves the Non-Linear Index algorithm to account for soil areas.')
    },
    'MSR': {
        'expr': '((N / R) - 1) / (sqrt(N / R) + 1)',
        'help': _('Modified Simple Ratio is an improvement of the Simple Ratio (SR) index to be more sensitive to vegetation.')
    },
    'RDVI': {
        'expr': '(N - R) / sqrt(N + R)',
        'help': _('Renormalized Difference Vegetation Index uses the difference between near-IR and red, plus NDVI to show areas of healthy vegetation.')
    },
    'TDVI': {
        'expr': '1.5 * ((N - R) / sqrt(N ** 2 + R + 0.5))',
        'help': _('Transformed Difference Vegetation Index highlights vegetation cover in urban environments.')
    },
    'OSAVI': {
        'expr': '(N - R) / (N + R + 0.16)',
        'help': _('Optimized Soil Adjusted Vegetation Index is based on SAVI, but tends to work better in areas with little vegetation where soil is visible.')
    },
    'LAI': {
        'expr': '3.618 * (2.5 * (N - R) / (N + 6*R - 7.5*B + 1)) * 0.118',
        'help': _('Leaf Area Index estimates foliage areas and predicts crop yields.'),
        'range': (-1, 1)
    },
    'EVI': {
        'expr': '2.5 * (N - R) / (N + 6*R - 7.5*B + 1)',
        'help': _('Enhanced Vegetation Index is useful in areas where NDVI might saturate, by using blue wavelengths to correct soil signals.'),
        'range': (-1, 1)
    },
    'Thermal C': {
        'expr': 'L',
        'help': _('Thermal temperature in Celsius degrees.')
    },
    'Thermal K': {
        'expr': 'L * 100 + 27315',
        'help': _('Thermal temperature in Centikelvin degrees.')
    },

    # more?

    '_TESTRB': {
        'expr': 'R + B',
        'range': (0,1)
    },

    '_TESTFUNC': {
        'expr': 'R + (sqrt(B) )'
    }
}

camera_filters = [
    'RGB',
    'RGN',
    'NGB',
    'NRG',
    'NRB',

    'RGBN',
    'GRReN',

    'BGRNRe',
    'BGRReN',
    'RGBNRe',
    'RGBReN',

    'BGRNReL',
    'BGRReNL',

    # more?
    # TODO: certain cameras have only two bands? eg. MAPIR NDVI BLUE+NIR
]

@lru_cache(maxsize=20)
def lookup_formula(algo, band_order = 'RGB'):
    if algo is None:
        return None, None
    if band_order is None:
        band_order = 'RGB'

    if algo not in algos:
        raise ValueError("Cannot find algorithm " + algo)

    input_bands = tuple(b for b in re.split(r"([A-Z][a-z]*)", band_order) if b != "")

    def repl(matches):
        b = matches.group(1)
        try:
            return 'b' + str(input_bands.index(b) + 1)
        except ValueError:
            raise ValueError("Cannot find band \"" + b + "\" from \"" + band_order + "\". Choose a proper band order.")

    expr = re.sub("([A-Z]+?[a-z]*)", repl, re.sub("\s+", "", algos[algo]['expr']))
    hrange = algos[algo].get('range', None)

    return expr, hrange

@lru_cache(maxsize=2)
def get_algorithm_list(max_bands=3):
    res = []
    for k in algos:
        if k.startswith("_"):
            continue
        
        cam_filters = get_camera_filters_for(algos[k], max_bands)
        
        if len(cam_filters) == 0:
            continue

        res.append({
            'id': k,
            'filters': cam_filters,
            **algos[k]
        })

    return res

def get_camera_filters_for(algo, max_bands=3):
    result = []
    expr = algo['expr']
    pattern = re.compile("([A-Z]+?[a-z]*)")
    bands = list(set(re.findall(pattern, expr)))
    for f in camera_filters:
        # Count bands that show up in the filter
        count = 0
        fbands = list(set(re.findall(pattern, f)))

        for b in fbands:
            if b in bands:
                count += 1

        # If all bands are accounted for, this is a valid filter for this algo
        if count >= len(bands) and len(fbands) <= max_bands:
            result.append(f)

    return result

