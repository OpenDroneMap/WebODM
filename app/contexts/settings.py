import logging

from app.models import Setting

logger = logging.getLogger('app.logger')

# Make the SETTINGS object available to all templates
def load(request=None):
    return {'SETTINGS': Setting.objects.first()}

# Helper functions for libsass

def theme(color):
    """Return a theme color from the currently selected theme"""
    try:
        return getattr(load()['SETTINGS'].theme, color)
    except Exception as e:
        logger.warning("Cannot load configuration from theme(): " + e.message)
        return "blue" # dah buh dih ah buh daa..


def complementary(hexcolor):
    """Returns complementary RGB color
    Example: complementaryColor('#FFFFFF') --> '#000000'
    """
    if hexcolor[0] == '#':
        hexcolor = hexcolor[1:]
    rgb = (hexcolor[0:2], hexcolor[2:4], hexcolor[4:6])
    comp = ['%02X' % (255 - int(a, 16)) for a in rgb]
    return '#' + ''.join(comp)


def scaleby(hexcolor, scalefactor, ignore_value = False):
    """
    Scales a hex string by ``scalefactor``, but is color dependent, unless ignore_value is True
    scalefactor is now always between 0 and 1. A value of 0.8
    will cause bright colors to become darker and
    dark colors to become brigther by 20%
    """

    def calculate(hexcolor, scalefactor):
        """
        Scales a hex string by ``scalefactor``. Returns scaled hex string.
        To darken the color, use a float value between 0 and 1.
        To brighten the color, use a float value greater than 1.

        >>> colorscale("#DF3C3C", .5)
        #6F1E1E
        >>> colorscale("#52D24F", 1.6)
        #83FF7E
        >>> colorscale("#4F75D2", 1)
        #4F75D2
        """

        def clamp(val, minimum=0, maximum=255):
            if val < minimum:
                return minimum
            if val > maximum:
                return maximum
            return int(val)

        hexcolor = hexcolor.strip('#')

        if scalefactor < 0 or len(hexcolor) != 6:
            return hexcolor

        r, g, b = int(hexcolor[:2], 16), int(hexcolor[2:4], 16), int(hexcolor[4:], 16)

        r = clamp(r * scalefactor)
        g = clamp(g * scalefactor)
        b = clamp(b * scalefactor)

        return "#%02x%02x%02x" % (r, g, b)


    hexcolor = hexcolor.strip('#')
    scalefactor = abs(float(scalefactor.value))
    scalefactor = min(1.0, max(0, scalefactor))

    r, g, b = int(hexcolor[:2], 16), int(hexcolor[2:4], 16), int(hexcolor[4:], 16)
    value = max(r, g, b)

    return calculate(hexcolor, scalefactor if ignore_value or value >= 127 else 2 - scalefactor)
