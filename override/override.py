from override_lib import interpret_text, read_file

text = read_file("override/shpjs.change")
interpret_text(text)
