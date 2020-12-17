#!/usr/bin/python3

import argparse, json, os

parser = argparse.ArgumentParser(description='Extract Potree strings.')
parser.add_argument('input', type=str,
                    help='Path to Potree\'s english translation.json')
parser.add_argument('output', type=str,
                    help='Where to write resulting translation file')
args = parser.parse_args()

strings = []
with open(args.input) as f:
    j = json.loads(f.read())
    for section in j:
        s = j[section]
        for k in s:
            english_str = s[k]
            strings.append(english_str)

print("Found %s Potree strings" % len(strings))
if len(strings) > 0:
    with open(args.output, "w") as f:
        f.write("// Auto-generated with extract_potree_strings.py, do not edit!\n\n")

        for s in strings:
            f.write("_(\"%s\");\n" % s.replace("\"", "\\\""))

    print("Wrote %s" % args.output)
else:
    print("No strings found")