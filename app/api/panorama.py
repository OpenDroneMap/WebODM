import os
import io
import math
import logging
import numpy as np
from PIL import Image
from django.core.exceptions import SuspiciousFileOperation
from django.http import HttpResponse
from rest_framework import exceptions

from app.api.media import TaskMediaBase
from app.security import path_traversal_check

logger = logging.getLogger('app.logger')

Image.MAX_IMAGE_PIXELS = None

TILE_SIZE = 2048

FACE_LETTERS = ['f', 'b', 'u', 'd', 'l', 'r']
FACE_INDEX = {c: i for i, c in enumerate(FACE_LETTERS)}

F1 = np.float32(1.0)
TWO_PI = np.float32(2.0 * np.pi)
PI = np.float32(np.pi)
HALF = np.float32(0.5)


def compute_params(filepath):
    with Image.open(filepath) as im:
        img_w = im.size[0]
    cube_size = 8 * int(img_w / math.pi / 8)
    tile_size = min(TILE_SIZE, cube_size)
    levels = int(math.ceil(math.log(float(cube_size) / tile_size, 2))) + 1
    if levels >= 2 and int(cube_size / 2 ** (levels - 2)) == tile_size:
        levels -= 1
    return cube_size, tile_size, levels


def render_tile(filepath, face_index, tile_left, tile_top, tile_w, tile_h, size_at_level):
    step = np.float32(2.0 / max(size_at_level - 1, 1))
    u = (np.arange(tile_left, tile_left + tile_w, dtype=np.float32) * step - F1)[np.newaxis, :]
    v = (np.arange(tile_top, tile_top + tile_h, dtype=np.float32) * step - F1)[:, np.newaxis]
    u_sq = u * u

    if face_index in (0, 1, 4, 5):
        r = np.sqrt(u_sq + F1)
        norm_py = np.arctan2(v, r)
        norm_py /= PI
        norm_py += HALF
        if face_index == 0:      # front
            norm_px = np.arctan(u) / TWO_PI + HALF
        elif face_index == 1:    # back
            norm_px = np.arctan2(-u, -F1) / TWO_PI + HALF
        elif face_index == 4:    # left
            norm_px = np.arctan2(-F1, u) / TWO_PI + HALF
        else:                    # right
            norm_px = np.arctan2(F1, -u) / TWO_PI + HALF
    elif face_index == 2:        # up
        norm_px = np.arctan2(u, v) / TWO_PI + HALF
        norm_py = np.sqrt(u_sq + v * v)
        np.arctan2(F1, norm_py, out=norm_py)
        norm_py /= -PI
        norm_py += HALF
    else:                        # down
        norm_px = np.arctan2(u, -v) / TWO_PI + HALF
        norm_py = np.sqrt(u_sq + v * v)
        np.arctan2(F1, norm_py, out=norm_py)
        norm_py /= PI
        norm_py += HALF

    py_lo, py_hi = float(norm_py.min()), float(norm_py.max())
    px_lo, px_hi = float(norm_px.min()), float(norm_px.max())

    img = Image.open(filepath)
    orig_w, orig_h = img.size

    needed = max(tile_w, tile_h) * 4
    if needed < min(orig_w, orig_h):
        img.draft('RGB', (needed, needed * orig_h // orig_w))

    aw, ah = img.size

    src_top = max(0, int(py_lo * ah) - 2)
    src_bot = min(ah, int(py_hi * ah) + 2)

    if px_hi - px_lo < 0.5:
        src_left = max(0, int(px_lo * aw) - 2)
        src_right = min(aw, int(px_hi * aw) + 2)
    else:
        src_left, src_right = 0, aw

    region = img.crop((src_left, src_top, src_right, src_bot))
    if region.mode != 'RGB':
        region = region.convert('RGB')
    arr = np.asarray(region)

    px = np.clip(norm_px * aw - src_left, 0, arr.shape[1] - 1).astype(np.int32)
    py = np.clip(norm_py * ah - src_top, 0, arr.shape[0] - 1).astype(np.int32)

    return Image.fromarray(arr[py, px])

class TaskPanoramaTiles(TaskMediaBase):
    def get(self, request, pk=None, project_pk=None, filename=None, level=None, face=None, row=None, col=None):
        task = self.get_and_check_task(request, pk)

        entry = task.get_media_entry(filename)
        if entry is None:
            raise exceptions.NotFound()
        
        filepath = task.media_directory_path(entry.get('filename', 'invalid'))
        if not os.path.isfile(filepath):
            raise exceptions.NotFound()

        if face not in FACE_INDEX:
            raise exceptions.NotFound()

        row = int(row)
        col = int(col)
        level = int(level)
        face_idx = FACE_INDEX[face]

        cube_size, tile_size, levels = compute_params(filepath)

        if level < 1 or level > levels:
            raise exceptions.NotFound()

        size_at_level = int(cube_size / 2 ** (levels - level))
        tiles_at_level = int(math.ceil(float(size_at_level) / tile_size))

        if row < 0 or row >= tiles_at_level or col < 0 or col >= tiles_at_level:
            raise exceptions.NotFound()

        left = col * tile_size
        upper = row * tile_size
        tile_w = min(tile_size, size_at_level - left)
        tile_h = min(tile_size, size_at_level - upper)

        tile = render_tile(filepath, face_idx, left, upper, tile_w, tile_h, size_at_level)
        buf = io.BytesIO()
        tile.save(buf, format='JPEG', quality=75)

        res = HttpResponse(content_type="image/jpeg")
        res.write(buf.getvalue())
        buf.close()
        res['Content-Disposition'] = 'inline'

        return res
