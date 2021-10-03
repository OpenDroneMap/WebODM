import matplotlib
import numpy

def generate_discrete_color_map_from_list_of_hex(list_of_hex_colors):
    colormap = matplotlib.colors.ListedColormap(list_of_hex_colors)
    color_map_dict = extract_colormap_dict_from_arr(colormap)
    return color_map_dict
def generate_linerar_segmented_color_map_from_list_of_hex(list_of_hex_colors, name_of_colormap="default_name", N=256):
    colormap = matplotlib.colors.LinearSegmentedColormap.from_list(name_of_colormap, list_of_hex_colors, N)
    color_map_dict = extract_colormap_dict_from_arr(colormap)
    return color_map_dict
def extract_colormap_dict_from_arr(colormap):
    x = numpy.linspace(0, 1, 256)
    cmap_vals = colormap(x)[:, :]
    cmap_uint8 = (cmap_vals * 255).astype('uint8')
    ndvi_dict = {idx: value.tolist() for idx, value in enumerate(cmap_uint8)}
    return ndvi_dict
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
    {"discrete_ndvi": generate_discrete_color_map_from_list_of_hex(contrast_ndvi_arr)},
    {"better_discrete_ndvi": generate_discrete_color_map_from_list_of_hex(ndvi_arr)},
    #add custom maps here
]
