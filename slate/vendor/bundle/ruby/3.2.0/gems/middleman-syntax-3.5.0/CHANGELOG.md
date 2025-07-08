# Changelog

All notable changes to this project will be documented in this file.

# 3.5.0

- Remove official support for Ruby 2.5 and 2.6 (#89).
- Add ability to add other classes to the :syntax plugin (#90).

# 3.4.0

- Haml 6 support (#82, #84).
- Migrate CI from Travis to GitHub Actions (#83).

# 3.3.0

- Remove trailing blank lines from HAML's :code filter (#79).
- Allow for Linewise Rouge formatter (#78).

# 3.2.0

- Prep for Middleman v5.

# 3.0.0

- Upgrade to Rouge 2.0 (#66).
- Added the ability to disable the line numbers on a specific code block when using Markdown and Redcarpet (#63).
- Lexer options are properly passed down to the highlighter.

# 2.1.0

- Version compatibility with Middleman 4 (#58).
- Allow passing Rouge formatter options from the `code` helper (#50).
- Fixed tests and code reorganization.

# 2.0.0

- Update to a new-style Middleman extension, dropping compatibility with Middleman versions older than 3.2.x.
- Setting the :css_class option will no longer prevent the language tag from being added as a class as well.
- Rouge lexer options should now be set via the :lexer_options option.
- It is now possible to override options when calling the `code` helper by passing them as the second argument.
- Using the `code` helper from Slim templates no longer escapes the output.
- Added a `:code` filter for Haml as a more whitespace-friendly alternative to the `code` helper.

# 1.2.1

- Restore compatibility with Middleman 3.0.x series.

# 1.2.0

- Support Kramdown as Markdown engine in addition to Redcarpet.
- Switch to Rouge from Pygments.rb.
- Fix bugs around setting language options.

# 1.1.1

- Properly merge language attribute for Markdown (#14).

# 1.1.0

- Avoid errors when language is empty (#9).
- Allow passing options to Pygments (#5, #7).

# 1.0.1

- Updated pygments.rb dependency.

# 1.0.0

- Initial release, basic syntax highlighting.
