require File.expand_path(File.dirname(__FILE__) + '/helper')
require File.expand_path(File.dirname(__FILE__) + '/fixtures/markup_app/app')

describe "FormatHelpers" do
  include Padrino::Helpers::FormatHelpers

  def app
    MarkupDemo
  end

  def setup
    Time.stubs(:now).returns(Time.utc(1983, 11, 9, 5))
  end

  describe 'for #simple_format method' do
    it 'should format simple text into html format' do
      actual_text = simple_format("Here is some basic text...\n...with a line break.")
      assert_equal true, actual_text.html_safe?
      assert_equal "<p>Here is some basic text...\n<br />...with a line break.</p>", actual_text
    end

    it 'should format more text into html format' do
      actual_text = simple_format("We want to put a paragraph...\n\n...right there.")
      assert_equal "<p>We want to put a paragraph...</p>\n\n<p>...right there.</p>", actual_text
    end

    it 'should support defining a class for the paragraphs' do
      actual_text = simple_format("Look me! A class!", :class => 'description')
      assert_equal "<p class=\"description\">Look me! A class!</p>", actual_text
    end

    it 'should escape html tags' do
      actual_text = simple_format("Will you escape <b>that</b>?")
      assert_equal "<p>Will you escape &lt;b&gt;that&lt;&#x2F;b&gt;?</p>", actual_text
    end

    it 'should support already sanitized text' do
      actual_text = simple_format("Don't try to escape <b>me</b>!".html_safe)
      assert_equal "<p>Don't try to escape <b>me</b>!</p>", actual_text
    end

    describe 'wrapped in a custom tag' do
      it 'should format simple text into html format' do
        actual_text = simple_format("Here is some basic text...\n...with a line break.", :tag => :div)
        assert_equal "<div>Here is some basic text...\n<br />...with a line break.</div>", actual_text
      end

      it 'should format more text into html format' do
        actual_text = simple_format("We want to put a paragraph...\n\n...right there.", :tag => :div)
        assert_equal "<div>We want to put a paragraph...</div>\n\n<div>...right there.</div>", actual_text
      end

      it 'should support defining a class for the paragraphs' do
        actual_text = simple_format("Look me! A class!", :class => 'description', :tag => :div)
        assert_equal "<div class=\"description\">Look me! A class!</div>", actual_text
      end
    end
  end

  describe 'for #word_wrap method' do
    it 'should return proper formatting for 8 max width' do
      actual_text = word_wrap('Once upon a time', :line_width => 8)
      assert_equal "Once\nupon a\ntime", actual_text
    end
    it 'should return proper formatting for 1 max width' do
      actual_text = word_wrap('Once upon a time', :line_width => 1)
      assert_equal "Once\nupon\na\ntime", actual_text
    end
    it 'should return proper formatting for default width' do
      actual_text = word_wrap((1..50).to_a.join(" "))
      assert_equal (1..30).to_a.join(" ") + "\n" + (31..50).to_a.join(" "), actual_text
      actual_text = word_wrap((1..50).to_a.join(" "), 80)
      assert_equal (1..30).to_a.join(" ") + "\n" + (31..50).to_a.join(" "), actual_text
    end
  end

  describe 'for #highlight method' do
    it 'should highligth with defaults' do
      actual_text = highlight('Lorem ipsum dolor sit amet', 'dolor')
      assert_equal 'Lorem ipsum <strong class="highlight">dolor</strong> sit amet', actual_text
    end

    it 'should highlight with highlighter' do
      actual_text = highlight('Lorem ipsum dolor sit amet', 'dolor', :highlighter => '<span class="custom">\1</span>')
      assert_equal 'Lorem ipsum <span class="custom">dolor</span> sit amet', actual_text
    end
  end

  describe 'for #truncate method' do
    it 'should support default truncation' do
      actual_text = truncate("Once upon a time in a world far far away")
      assert_equal "Once upon a time in a world...", actual_text
    end
    it 'should support specifying length' do
      actual_text = truncate("Once upon a time in a world far far away", :length => 14)
      assert_equal "Once upon a...", actual_text
    end
    it 'should support specifying omission text' do
      actual_text = truncate("And they found that many people were sleeping better.", :length => 25, :omission => "(clipped)")
      assert_equal "And they found t(clipped)", actual_text
    end
  end

  describe 'for #truncate_words method' do
    it 'should support default truncation' do
      actual_text = truncate_words("Long before books were made, people told stories. They told them to one another and to the children as they sat before the fire. Many of these stories were about interesting people, but most of them were about the ways of fairies and giants.")
      assert_equal "Long before books were made, people told stories. They told them to one another and to the children as they sat before the fire. Many of these stories were about...", actual_text
    end
    it 'should support specifying length' do
      actual_text = truncate_words("Once upon a time in a world far far away", :length => 8)
      assert_equal "Once upon a time in a world far...", actual_text
    end
    it 'should support specifying omission text' do
      actual_text = truncate_words("And they found that many people were sleeping better.", :length => 4, :omission => "(clipped)")
      assert_equal "And they found that(clipped)", actual_text
    end
  end

  describe 'for #h and #h! method' do
    it 'should escape the simple html' do
      assert_equal '&lt;h1&gt;hello&lt;&#x2F;h1&gt;', h('<h1>hello</h1>')
      assert_equal '&lt;h1&gt;hello&lt;&#x2F;h1&gt;', escape_html('<h1>hello</h1>')
    end
    it 'should escape all brackets, quotes and ampersands' do
      assert_equal '&lt;h1&gt;&lt;&gt;&quot;&amp;demo&amp;&quot;&lt;&gt;&lt;&#x2F;h1&gt;', h('<h1><>"&demo&"<></h1>')
    end
    it 'should return default text if text is empty' do
      assert_equal 'default', h!("", "default")
      assert_equal '&nbsp;', h!("")
    end
    it 'should return text escaped if not empty' do
      assert_equal '&lt;h1&gt;hello&lt;&#x2F;h1&gt;', h!('<h1>hello</h1>')
    end
    it 'should mark escaped text as safe' do
      assert_equal false, '<h1>hello</h1>'.html_safe?
      assert_equal true, h('<h1>hello</h1>').html_safe?
      assert_equal true, h!("", "default").html_safe?
    end
  end

  describe 'for #time_ago_in_words method' do
    _DAY = 24*60*60

    it 'should less than 5 seconds' do
      assert_equal 'less than 5 seconds', time_ago_in_words(Time.now, true)
    end
    it 'should less than 10 seconds' do
      assert_equal 'less than 10 seconds', time_ago_in_words(Time.now-5, true)
    end
    it 'should less than 20 seconds' do
      assert_equal 'less than 20 seconds', time_ago_in_words(Time.now-10, true)
    end
    it 'should less than a minute' do
      assert_equal 'less than a minute', time_ago_in_words(Time.now-40, true)
    end
    it 'should 2 minutes' do
      assert_equal '2 minutes', time_ago_in_words(Time.now-120, true)
    end
    it 'should display today' do
      assert_equal 'less than a minute', time_ago_in_words(Time.now)
    end
    it 'should display yesterday' do
      assert_equal '1 day', time_ago_in_words(Time.now - _DAY)
    end
    it 'should display tomorrow' do
      assert_equal '1 day', time_ago_in_words(Time.now + _DAY)
    end
    it 'should return future number of days' do
      assert_equal '4 days', time_ago_in_words(Time.now + 4*_DAY)
    end
    it 'should return past days ago' do
      assert_equal '4 days', time_ago_in_words(Time.now - 4*_DAY)
    end
    it 'should return formatted archived date' do
      assert_equal '3 months', time_ago_in_words(Time.now - 100*_DAY)
    end
    it 'should return formatted archived year date' do
      assert_equal 'over 1 year', time_ago_in_words(Time.now - 500*_DAY)
    end
    it 'should display now as a minute ago' do
      assert_equal '1 minute', time_ago_in_words(Time.now - 60)
    end
    it 'should display a few minutes ago' do
      assert_equal '4 minutes', time_ago_in_words(Time.now - 4*60)
    end
    it 'should display an hour ago' do
      assert_equal 'about 1 hour', time_ago_in_words(Time.now - 60*60 + 5)
    end
    it 'should display a few hours ago' do
      assert_equal 'about 3 hours', time_ago_in_words(Time.now - 3*60*60 + 5*60)
    end
    it 'should display a few days ago' do
      assert_equal '5 days', time_ago_in_words(Time.now - 5*_DAY - 5*60)
    end
    it 'should display a month ago' do
      assert_equal 'about 1 month', time_ago_in_words(Time.now - 32*_DAY + 5*60)
    end
    it 'should display a few months ago' do
      assert_equal '6 months', time_ago_in_words(Time.now - 180*_DAY - 5*60)
    end
    it 'should display a year ago' do
      assert_equal 'about 1 year', time_ago_in_words(Time.now - 365*_DAY - 5*60)
    end
    it 'should display a few years ago' do
      assert_equal 'over 7 years', time_ago_in_words(Time.now - 2800*_DAY - 5*60)
    end
  end

  describe 'for #js_escape_html method' do
    it 'should escape double quotes' do
      assert_equal "\\\"hello\\\"", js_escape_html('"hello"')
      assert_equal "\\\"hello\\\"", js_escape_html(SafeBuffer.new('"hello"'))
    end
    it 'should escape single quotes' do
      assert_equal "\\'hello\\'", js_escape_html("'hello'")
      assert_equal "\\'hello\\'", js_escape_html(SafeBuffer.new("'hello'"))
    end
    it 'should escape html tags and breaks' do
      assert_equal "\\n\\n<p>hello<\\/p>\\n", js_escape_html("\n\r<p>hello</p>\r\n")
      assert_equal "\\n\\n<p>hello<\\/p>\\n", js_escape_html(SafeBuffer.new("\n\r<p>hello</p>\r\n"))
    end
    it 'should escape data-confirm attribute' do
      assert_equal "<data-confirm=\\\"are you sure\\\">", js_escape_html("<data-confirm=\"are you sure\">")
      assert_equal "<data-confirm=\\\"are you sure\\\">", js_escape_html(SafeBuffer.new("<data-confirm=\"are you sure\">"))
    end
    it 'should keep html_safe content html_safe' do
      assert_equal false, js_escape_html('"hello"').html_safe?
      assert_equal true, js_escape_html(SafeBuffer.new('"hello"')).html_safe?
    end
  end
end
