import glob
import os
import logging

logger = logging.getLogger('app.logger')

class GCPFile:
    def __init__(self, gcp_path):
        self.gcp_path = gcp_path
        self.entries = []
        self.raw_srs = ""
        self.read()

    def read(self):
        if self.exists():
            with open(self.gcp_path, 'r') as f:
                contents = f.read().strip()

            lines = list(map(str.strip, contents.split('\n')))
            if lines:
                self.raw_srs = lines[0]  # SRS

                for line in lines[1:]:
                    if line != "" and line[0] != "#":
                        parts = line.split()
                        if len(parts) >= 6:
                            self.entries.append(line)
                        else:
                            logger.warning("Malformed GCP line: %s" % line)
        else:
            logger.warning("GCP file %s does not exist" % self.gcp_path)

    def iter_entries(self):
        for entry in self.entries:
            yield self.parse_entry(entry)

    def parse_entry(self, entry):
        if entry:
            parts = entry.split()
            x, y, z, px, py, filename = parts[:6]
            extras = " ".join(parts[6:])
            return GCPEntry(float(x), float(y), float(z), float(px), float(py), filename, extras)

    def get_entry(self, n):
        if n < self.entries_count():
            return self.parse_entry(self.entries[n])

    def entries_count(self):
        return len(self.entries)

    def exists(self):
        return bool(self.gcp_path and os.path.exists(self.gcp_path))

    def create_resized_copy(self, gcp_file_output, image_ratios):
        """
        Creates a new resized GCP file from an existing GCP file. If one already exists, it will be removed.
        :param gcp_file_output output path of new GCP file
        :param image_ratios dictionary with "imagename" --> "resize_ratio" values
        :return path to new GCP file
        """
        output = [self.raw_srs]

        for entry in self.iter_entries():
            entry.px *= image_ratios.get(entry.filename.lower(), 1.0)
            entry.py *= image_ratios.get(entry.filename.lower(), 1.0)
            output.append(str(entry))

        with open(gcp_file_output, 'w') as f:
            f.write('\n'.join(output) + '\n')

        return gcp_file_output


class GCPEntry:
    def __init__(self, x, y, z, px, py, filename, extras=""):
        self.x = x
        self.y = y
        self.z = z
        self.px = px
        self.py = py
        self.filename = filename
        self.extras = extras

    def __str__(self):
        return "{} {} {} {} {} {} {}".format(self.x, self.y, self.z,
                                             self.px, self.py,
                                             self.filename,
                                             self.extras).rstrip()