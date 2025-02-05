# Based on matplotlib https://github.com/matplotlib/matplotlib/blob/master/LICENSE/LICENSE
# Copyright (c)
# 2012- Matplotlib Development Team; All Rights Reserved
# Description of changes: Factored out hillshading code


import numpy as np

def _vector_magnitude(arr):
    # things that don't work here:
    #  * np.linalg.norm
    #    - doesn't broadcast in numpy 1.7
    #    - drops the mask from ma.array
    #  * using keepdims - broken on ma.array until 1.11.2
    #  * using sum - discards mask on ma.array unless entire vector is masked

    sum_sq = 0
    for i in range(arr.shape[-1]):
        sum_sq += np.square(arr[..., i, np.newaxis])
    return np.sqrt(sum_sq)

class LightSource:
    def __init__(self, azdeg=315, altdeg=45):
        self.azdeg = azdeg
        self.altdeg = altdeg

    @property
    def direction(self):
        """The unit vector direction towards the light source."""
        # Azimuth is in degrees clockwise from North. Convert to radians
        # counterclockwise from East (mathematical notation).
        az = np.radians(90 - self.azdeg)
        alt = np.radians(self.altdeg)
        return np.array([
            np.cos(az) * np.cos(alt),
            np.sin(az) * np.cos(alt),
            np.sin(alt)
        ])


    def hillshade(self, elevation, vert_exag=1, dx=1, dy=1, fraction=1.):
        """
        Calculates the illumination intensity for a surface using the defined
        azimuth and elevation for the light source.
        This computes the normal vectors for the surface, and then passes them
        on to `shade_normals`
        Parameters
        ----------
        elevation : array-like
            A 2d array (or equivalent) of the height values used to generate an
            illumination map
        vert_exag : number, optional
            The amount to exaggerate the elevation values by when calculating
            illumination. This can be used either to correct for differences in
            units between the x-y coordinate system and the elevation
            coordinate system (e.g. decimal degrees vs. meters) or to
            exaggerate or de-emphasize topographic effects.
        dx : number, optional
            The x-spacing (columns) of the input *elevation* grid.
        dy : number, optional
            The y-spacing (rows) of the input *elevation* grid.
        fraction : number, optional
            Increases or decreases the contrast of the hillshade.  Values
            greater than one will cause intermediate values to move closer to
            full illumination or shadow (and clipping any values that move
            beyond 0 or 1). Note that this is not visually or mathematically
            the same as vertical exaggeration.
        Returns
        -------
        intensity : ndarray
            A 2d array of illumination values between 0-1, where 0 is
            completely in shadow and 1 is completely illuminated.
        """
        # compute the normal vectors from the partial derivatives
        e_dy, e_dx = np.gradient(vert_exag * elevation, dy, dx)
        
        normal = np.empty(elevation.shape + (3,), dtype=np.float32)
        normal[..., 0] = -e_dx
        normal[..., 1] = -e_dy
        normal[..., 2] = 1
        np.divide(normal, _vector_magnitude(normal), out=normal)

        return self.shade_normals(normal, fraction)


    def shade_normals(self, normals, fraction=1.):
        """
        Calculates the illumination intensity for the normal vectors of a
        surface using the defined azimuth and elevation for the light source.
        Imagine an artificial sun placed at infinity in some azimuth and
        elevation position illuminating our surface. The parts of the surface
        that slope toward the sun should brighten while those sides facing away
        should become darker.
        Parameters
        ----------
        fraction : number, optional
            Increases or decreases the contrast of the hillshade.  Values
            greater than one will cause intermediate values to move closer to
            full illumination or shadow (and clipping any values that move
            beyond 0 or 1). Note that this is not visually or mathematically
            the same as vertical exaggeration.
        Returns
        -------
        intensity : ndarray
            A 2d array of illumination values between 0-1, where 0 is
            completely in shadow and 1 is completely illuminated.
        """

        intensity = normals.dot(self.direction.astype(np.float32))

        # Apply contrast stretch
        # imin, imax = np.nanmin(intensity), np.nanmax(intensity)
        intensity *= fraction

        # Rescale to 0-1, keeping range before contrast stretch
        # If constant slope, keep relative scaling (i.e. flat should be 0.5,
        # fully occluded 0, etc.)
        # if (imax - imin) > 1e-6:
            # Strictly speaking, this is incorrect. Negative values should be
            # clipped to 0 because they're fully occluded. However, rescaling
            # in this manner is consistent with the previous implementation and
            # visually appears better than a "hard" clip.
            # intensity -= imin
            # intensity /= (imax - imin)
        intensity = np.clip(intensity, 0, 1)

        return intensity