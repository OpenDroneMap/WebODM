# Algos from https://github.com/dirceup/tiled-vegetation-indices/blob/master/app/lib/vegetation_index.rb
import re

algos = {
    'vari': {
        'bands': 'RGB',
        'expr': '(G-R)/(G+R-B)'
    },

    'TEST': {
        'bands': 'RGB',
        'expr': 'B+R'
    }
}

band_map = {
    'RGB': (0, 1, 2),


    'BGR': (2, 1, 0),
}

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

    return re.sub("([A-Z]+?[a-z]*)", repl, algos[algo]['expr'])
